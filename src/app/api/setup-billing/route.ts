import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user;
    const supabase = await createSupabaseServerClient();

    // Check if user already has a subscription
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (existingSubscription) {
      return NextResponse.json({ 
        success: true, 
        message: 'User already has an active subscription',
        subscription_id: existingSubscription.id 
      });
    }

    // Get the free plan
    const { data: freePlan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('name', 'Free')
      .eq('is_active', true)
      .single();

    if (!freePlan || planError) {
      console.error('Free plan not found:', planError);
      return NextResponse.json({ error: 'Free plan not available' }, { status: 500 });
    }

    // Get user profile for organization_id
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    // Create free subscription
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
      .select('*')
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
        tokens_limit: freePlan.monthly_token_limit,
        overage_tokens: 0,
        amount_charged_cents: 0,
        status: 'active',
      });

    if (billingError) {
      console.error('Error creating billing period:', billingError);
      // Don't fail the subscription creation for this
    }

    return NextResponse.json({
      success: true,
      message: 'Free subscription created successfully',
      subscription: newSubscription,
    });

  } catch (error) {
    console.error('Setup billing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}