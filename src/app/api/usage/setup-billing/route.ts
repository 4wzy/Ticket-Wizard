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
      .single();

    if (existingSubscription) {
      return NextResponse.json({ 
        success: true, 
        message: 'Billing already set up',
        subscription_id: existingSubscription.id 
      });
    }

    // Get the free plan
    const { data: freePlan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('name', 'Free')
      .single();

    if (!freePlan) {
      return NextResponse.json({ error: 'Free plan not found' }, { status: 500 });
    }

    // Create user subscription with free plan
    const { data: subscription, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: user.id,
        subscription_plan_id: freePlan.id,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      })
      .select()
      .single();

    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError);
      return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
    }

    // Create initial billing period
    const { error: billingError } = await supabase
      .from('billing_periods')
      .insert({
        user_subscription_id: subscription.id,
        period_start: subscription.current_period_start,
        period_end: subscription.current_period_end,
        total_tokens_used: 0,
        total_amount_due: 0,
        status: 'active'
      });

    if (billingError) {
      console.error('Error creating billing period:', billingError);
      // Don't fail the request for this, it's not critical
    }

    return NextResponse.json({
      success: true,
      message: 'Billing setup complete',
      subscription: {
        id: subscription.id,
        plan_name: freePlan.name,
        monthly_token_limit: freePlan.monthly_token_limit,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
      }
    });

  } catch (error) {
    console.error('Setup billing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}