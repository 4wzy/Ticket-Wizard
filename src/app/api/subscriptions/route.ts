import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createSupabaseServerClient } from '@/lib/supabase-server';
import type { Database } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user;
    const supabase = await createSupabaseServerClient();

    // Get user's current subscription with plan details
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plans!inner(*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching subscription:', error);
      return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
    }

    // If no active subscription, create a free one
    if (!subscription) {
      const { data: freePlan } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('name', 'Free')
        .eq('is_active', true)
        .single();

      if (freePlan) {
        // Get user profile to get organization_id
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        const { data: newSubscription, error: createError } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: user.id,
            organization_id: userProfile?.organization_id || null,
            subscription_plan_id: freePlan.id,
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          })
          .select(`
            *,
            subscription_plans!inner(*)
          `)
          .single();

        if (createError) {
          console.error('Error creating free subscription:', createError);
          return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
        }

        return NextResponse.json({ subscription: newSubscription });
      }
    }

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error('Subscription API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user;
    const { plan_id, stripe_subscription_id, stripe_customer_id } = await request.json();

    if (!plan_id) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // Verify the plan exists and is active
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', plan_id)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Cancel existing active subscription
    const { error: cancelError } = await supabase
      .from('user_subscriptions')
      .update({ status: 'canceled' })
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (cancelError) {
      console.error('Error canceling existing subscription:', cancelError);
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
    }

    // Get user profile for organization_id
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    // Create new subscription
    const { data: newSubscription, error: createError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: user.id,
        organization_id: userProfile?.organization_id || null,
        subscription_plan_id: plan_id,
        stripe_subscription_id,
        stripe_customer_id,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select(`
        *,
        subscription_plans!inner(*)
      `)
      .single();

    if (createError) {
      console.error('Error creating subscription:', createError);
      return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
    }

    // Create initial billing period
    const { error: billingError } = await supabase
      .from('billing_periods')
      .insert({
        subscription_id: newSubscription.id,
        period_start: newSubscription.current_period_start,
        period_end: newSubscription.current_period_end,
        tokens_used: 0,
        tokens_limit: plan.monthly_token_limit,
        overage_tokens: 0,
        amount_charged_cents: plan.price_cents,
        status: 'active',
      });

    if (billingError) {
      console.error('Error creating billing period:', billingError);
      // Don't fail the subscription creation for this
    }

    return NextResponse.json({ subscription: newSubscription });
  } catch (error) {
    console.error('Subscription creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}