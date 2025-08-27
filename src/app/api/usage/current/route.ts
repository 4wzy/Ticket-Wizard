import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { checkUsageLimit, getUserSubscription } from '@/lib/usage-tracking';

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.id;

    // Get current usage limits and subscription info
    const [usageLimit, subscription] = await Promise.all([
      checkUsageLimit(userId),
      getUserSubscription(userId),
    ]);

    // If no subscription exists, create a default free one
    if (!subscription) {
      console.log('No subscription found, user might need to be set up with free plan');
      return NextResponse.json({
        usage: {
          current: 0,
          limit: 10000, // Default free plan limit
          overage: 0,
          percentage: 0,
          period_start: new Date(),
          period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          is_unlimited: false,
        },
        subscription: {
          plan_name: 'Free',
          status: 'pending_setup',
        },
      });
    }

    if (!usageLimit) {
      return NextResponse.json({ error: 'Unable to fetch usage information' }, { status: 500 });
    }

    const usagePercentage = subscription.monthly_token_limit === -1 
      ? 0 
      : (usageLimit.current_usage / usageLimit.limit) * 100;

    return NextResponse.json({
      usage: {
        current: usageLimit.current_usage,
        limit: usageLimit.limit,
        overage: usageLimit.overage,
        percentage: Math.min(100, usagePercentage),
        period_start: usageLimit.period_start,
        period_end: usageLimit.period_end,
        is_unlimited: usageLimit.limit === -1,
      },
      subscription: {
        plan_name: subscription.plan_name,
        status: subscription.status,
      },
    });
  } catch (error) {
    console.error('Current usage API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}