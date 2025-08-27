import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = authResult.user;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Create a client with the user's access token to respect RLS properly
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Get usage history for the specified period
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);


    const { data: usageHistory, error } = await supabase
      .from('token_usage_events')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);


    if (error) {
      console.error('Error fetching usage history:', error);
      return NextResponse.json({ error: 'Failed to fetch usage history' }, { status: 500 });
    }

    // Handle case where no usage history exists yet
    const events = usageHistory || [];

    // Aggregate usage by day and feature
    const dailyUsage = events.reduce((acc, event) => {
      const date = event.created_at.split('T')[0]; // Get YYYY-MM-DD
      if (!acc[date]) {
        acc[date] = { total: 0, features: {} };
      }
      acc[date].total += event.tokens_used;
      if (!acc[date].features[event.feature_used]) {
        acc[date].features[event.feature_used] = 0;
      }
      acc[date].features[event.feature_used] += event.tokens_used;
      return acc;
    }, {} as Record<string, { total: number; features: Record<string, number> }>);

    // Aggregate usage by feature for the entire period
    const featureUsage = events.reduce((acc, event) => {
      if (!acc[event.feature_used]) {
        acc[event.feature_used] = 0;
      }
      acc[event.feature_used] += event.tokens_used;
      return acc;
    }, {} as Record<string, number>);

    // Aggregate usage by model for the entire period
    const modelUsage = events.reduce((acc, event) => {
      const model = event.model_used || 'gemini-2.5-flash'; // Default for old records
      if (!acc[model]) {
        acc[model] = 0;
      }
      acc[model] += event.tokens_used;
      return acc;
    }, {} as Record<string, number>);

    const totalUsage = events.reduce((sum, event) => sum + event.tokens_used, 0);


    return NextResponse.json({
      usage_history: {
        total_events: events.length,
        total_tokens: totalUsage,
        daily_usage: dailyUsage,
        feature_breakdown: featureUsage,
        model_breakdown: modelUsage,
        raw_events: events.slice(0, 50), // Return last 50 events for detailed view
      },
    });
  } catch (error) {
    console.error('Usage history API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}