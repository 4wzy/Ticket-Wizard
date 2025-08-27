import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Create Supabase client for server-side operations
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface TokenUsageEvent {
  endpoint: string;
  tokens_used: number;
  model_used: string;
  feature_used: string;
  request_id?: string;
}

export interface UsageLimit {
  current_usage: number;
  limit: number;
  period_start: Date;
  period_end: Date;
  overage: number;
}

export interface SubscriptionInfo {
  id: string;
  plan_name: string;
  monthly_token_limit: number;
  current_period_start: Date;
  current_period_end: Date;
  status: string;
}

/**
 * Records a token usage event for billing and analytics
 */
export async function recordTokenUsage(usage: TokenUsageEvent, userId: string): Promise<void> {
  try {
    // Get user's current subscription
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select(`
        id,
        organization_id,
        current_period_start,
        current_period_end,
        subscription_plans!inner(monthly_token_limit)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    let finalSubscription = subscription;

    if (!subscription) {
      console.warn('Token usage tracking: No active subscription found for user, attempting to set up billing...');
      
      // Try to automatically set up billing for the user
      const newSubscription = await setupUserBilling(userId);
      if (!newSubscription) {
        console.error('Failed to setup billing for user');
        return;
      }
      
      finalSubscription = newSubscription;
    }

    if (!finalSubscription) {
      console.error('No subscription available for user');
      return;
    }

    // Get user's team membership (if any) for the current context
    const { data: teamMembership } = await supabase
      .from('user_team_memberships')
      .select('team_id')
      .eq('user_id', userId)
      .limit(1)
      .single();

    // Record the usage event
    const { error } = await supabase
      .from('token_usage_events')
      .insert({
        user_id: userId,
        organization_id: finalSubscription.organization_id,
        team_id: teamMembership?.team_id || null,
        subscription_id: finalSubscription.id,
        endpoint: usage.endpoint,
        tokens_used: usage.tokens_used,
        model_used: usage.model_used,
        feature_used: usage.feature_used,
        request_id: usage.request_id || crypto.randomUUID(),
        billing_period_start: finalSubscription.current_period_start,
        billing_period_end: finalSubscription.current_period_end,
      });

    if (error) {
      console.error('Failed to record token usage:', error);
    }
  } catch (error) {
    console.error('Token usage tracking error:', error);
  }
}

/**
 * Checks if user has exceeded their token limit
 */
export async function checkUsageLimit(userId: string): Promise<UsageLimit | null> {
  try {
    // Get current subscription and billing period
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select(`
        id,
        current_period_start,
        current_period_end,
        subscription_plans!inner(monthly_token_limit)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    let finalSubscription = subscription;

    if (!subscription || subError) {
      console.log('No active subscription found for user:', userId, subError);
      
      // Try to set up billing for the user
      const newSubscription = await setupUserBilling(userId);
      if (!newSubscription) {
        return null;
      }
      
      finalSubscription = newSubscription;
    }

    if (!finalSubscription) {
      return null;
    }

    const limit = finalSubscription.subscription_plans.monthly_token_limit;
    
    // -1 means unlimited
    if (limit === -1) {
      return {
        current_usage: 0,
        limit: -1,
        period_start: new Date(finalSubscription.current_period_start),
        period_end: new Date(finalSubscription.current_period_end),
        overage: 0,
      };
    }

    // Get current usage for this billing period
    const { data: usage } = await supabase
      .from('token_usage_events')
      .select('tokens_used')
      .eq('user_id', userId)
      .eq('subscription_id', finalSubscription.id)
      .gte('created_at', finalSubscription.current_period_start)
      .lte('created_at', finalSubscription.current_period_end);

    const currentUsage = usage?.reduce((sum, event) => sum + event.tokens_used, 0) || 0;
    const overage = Math.max(0, currentUsage - limit);

    return {
      current_usage: currentUsage,
      limit,
      period_start: new Date(finalSubscription.current_period_start),
      period_end: new Date(finalSubscription.current_period_end),
      overage,
    };
  } catch (error) {
    console.error('Usage limit check error:', error);
    return null;
  }
}

/**
 * Enforces usage limits - returns false if user has exceeded limits
 */
export async function enforceUsageLimit(tokensNeeded: number = 0, userId: string): Promise<{
  allowed: boolean;
  usage?: UsageLimit;
  message?: string;
}> {
  try {
    const usageLimit = await checkUsageLimit(userId);
    
    if (!usageLimit) {
      return { allowed: false, message: 'Unable to verify usage limits' };
    }

    // Unlimited plan
    if (usageLimit.limit === -1) {
      return { allowed: true, usage: usageLimit };
    }

    const wouldExceed = (usageLimit.current_usage + tokensNeeded) > usageLimit.limit;
    
    if (wouldExceed) {
      return {
        allowed: false,
        usage: usageLimit,
        message: `This request would exceed your monthly limit of ${usageLimit.limit.toLocaleString()} tokens. Please upgrade your plan to continue.`
      };
    }

    return { allowed: true, usage: usageLimit };
  } catch (error) {
    console.error('Usage limit enforcement error:', error);
    return { allowed: false, message: 'Error checking usage limits' };
  }
}

/**
 * Gets user's current subscription information
 */
export async function getUserSubscription(userId: string): Promise<SubscriptionInfo | null> {
  try {
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select(`
        id,
        current_period_start,
        current_period_end,
        status,
        subscription_plans!inner(name, monthly_token_limit)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!subscription) return null;

    return {
      id: subscription.id,
      plan_name: subscription.subscription_plans.name,
      monthly_token_limit: subscription.subscription_plans.monthly_token_limit,
      current_period_start: new Date(subscription.current_period_start),
      current_period_end: new Date(subscription.current_period_end),
      status: subscription.status,
    };
  } catch (error) {
    console.error('Get subscription error:', error);
    return null;
  }
}

/**
 * Estimates token usage for different operations
 * @deprecated Use estimateTokenUsage from ai-config.ts instead
 */
export function estimateTokenUsage(operation: string, textLength: number = 0): number {
  const baseEstimates = {
    'chat': Math.max(100, Math.ceil(textLength * 0.4)),
    'refine': Math.max(200, Math.ceil(textLength * 0.6)),
    'assess': Math.max(150, Math.ceil(textLength * 0.5)),
  };
  
  return baseEstimates[operation as keyof typeof baseEstimates] || 100;
}

/**
 * Sets up billing for a user who doesn't have a subscription
 */
async function setupUserBilling(userId: string): Promise<Record<string, unknown> | null> {
  try {
    // Get user's organization_id from their profile
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    // Get the free plan
    const { data: freePlan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('name', 'Free')
      .single();

    if (!freePlan) {
      console.error('Free plan not found in database');
      return null;
    }

    // Create user subscription with free plan and organization_id
    const { data: subscription, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        organization_id: userProfile?.organization_id || null, // Include organization_id
        subscription_plan_id: freePlan.id,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      })
      .select()
      .single();

    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError);
      return null;
    }

    // Create initial billing period
    const { error: billingError } = await supabase
      .from('billing_periods')
      .insert({
        subscription_id: subscription.id,
        period_start: subscription.current_period_start,
        period_end: subscription.current_period_end,
        tokens_used: 0,
        tokens_limit: freePlan.monthly_token_limit,
        overage_tokens: 0,
        amount_charged_cents: 0,
        status: 'active'
      });

    if (billingError) {
      console.error('Error creating billing period:', billingError);
      // Don't fail for this, it's not critical for usage tracking
    }

    // Return the subscription in the format expected by recordTokenUsage
    return {
      id: subscription.id,
      organization_id: subscription.organization_id,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      subscription_plans: {
        monthly_token_limit: freePlan.monthly_token_limit
      }
    };

  } catch (error) {
    console.error('Setup user billing error:', error);
    return null;
  }
}