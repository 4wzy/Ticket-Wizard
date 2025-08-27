import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { Database } from '@/types/database';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    // Get all active subscription plans
    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_cents', { ascending: true });

    if (error) {
      console.error('Error fetching subscription plans:', error);
      return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
    }

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Subscription plans API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}