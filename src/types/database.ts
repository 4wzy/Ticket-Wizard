export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  is_team_plan: boolean;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  plan_tier: 'trial' | 'apprentice' | 'wizard' | 'archmage' | 'enterprise';
  token_limit: number;
  tokens_used: number;
  tokens_reset_date: string;
  settings: Record<string, any>;
  features: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description?: string;
  token_limit: number;
  tokens_used: number;
  tokens_reset_date: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  organization_id?: string;
  full_name?: string;
  org_role: 'org_admin' | 'member';
  status: 'active' | 'pending' | 'suspended';
  tokens_used: number;
  last_active: string;
  joined_organization_at: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectContext {
  id: string;
  organization_id: string;
  team_id?: string; // null for org-wide contexts
  name: string;
  description?: string;
  abbreviations: Record<string, any>;
  terminology: Record<string, any>;
  project_info?: string;
  standards?: string;
  visibility_scope: 'global' | 'organization' | 'team' | 'private';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: string;
  organization_id?: string;
  team_id?: string;
  created_by: string;
  name: string;
  description?: string;
  category?: string;
  tags: string[];
  title_format: string;
  description_format: string;
  acceptance_criteria_format: string;
  additional_fields: any[];
  visibility_scope: 'global' | 'organization' | 'team' | 'private';
  created_at: string;
  updated_at: string;
}

export interface UsageEvent {
  id: string;
  organization_id: string;
  team_id?: string;
  user_id: string;
  event_type: 'ticket_created' | 'ticket_refined' | 'template_used';
  tokens_consumed: number;
  metadata: Record<string, any>;
  session_id?: string;
  created_at: string;
}

// New billing and subscription types
export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  monthly_token_limit: number;
  price_cents: number;
  stripe_price_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  organization_id?: string;
  subscription_plan_id: string;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
  // Relations
  subscription_plans?: SubscriptionPlan;
}

export interface TokenUsageEvent {
  id: string;
  user_id: string;
  organization_id?: string;
  team_id?: string;
  subscription_id?: string;
  endpoint: string;
  tokens_used: number;
  model_used: string;
  feature_used: string;
  request_id?: string;
  billing_period_start: string;
  billing_period_end: string;
  created_at: string;
}

export interface BillingPeriod {
  id: string;
  subscription_id: string;
  period_start: string;
  period_end: string;
  tokens_used: number;
  tokens_limit: number;
  overage_tokens: number;
  amount_charged_cents: number;
  stripe_invoice_id?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface UsageQuota {
  id: string;
  organization_id?: string;
  team_id?: string;
  quota_type: string;
  token_limit: number;
  reset_period: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserTemplateFavorite {
  user_id: string;
  template_id: string;
  created_at: string;
}

export interface UserTeamMembership {
  id: string;
  user_id: string;
  team_id: string;
  team_role: 'team_admin' | 'member' | 'viewer';
  joined_at: string;
  created_at: string;
  updated_at: string;
  // Populated relations
  team?: Team;
  user?: UserProfile;
}

export interface UserWithTeams extends UserProfile {
  team_memberships: (UserTeamMembership & { team: Team })[];
}

// Legacy interface - to be deprecated
export interface JiraProjectPermission {
  id: string;
  user_id: string;
  project_id: string;
  project_key: string;
  project_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// New multi-platform interfaces
export type PlatformType = 'jira' | 'trello' | 'github' | 'linear';

export interface PlatformProjectPermission {
  id: string;
  user_id: string;
  platform: PlatformType;
  project_id: string;
  project_key: string;
  project_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlatformConnection {
  id: string;
  user_id: string;
  platform: PlatformType;
  instance_url?: string;
  credentials: Record<string, any>; // Encrypted JSON
  is_active: boolean;
  last_connected: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationInvitation {
  id: string;
  organization_id: string;
  created_by: string;
  invite_code: string;
  email?: string; // Optional - for specific email invites
  invite_type: 'organization' | 'team';
  org_role?: 'org_admin' | 'member';
  max_uses?: number; // Optional - limit number of uses
  uses_count: number;
  expires_at?: string; // Optional - expiration date
  status: 'active' | 'expired' | 'disabled';
  metadata?: Record<string, any>; // For storing team membership data
  created_at: string;
  updated_at: string;
}

// Database schema type for Supabase
export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Organization, 'id' | 'created_at' | 'updated_at'>>;
      };
      teams: {
        Row: Team;
        Insert: Omit<Team, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Team, 'id' | 'created_at' | 'updated_at'>>;
      };
      user_profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>;
      };
      project_contexts: {
        Row: ProjectContext;
        Insert: Omit<ProjectContext, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ProjectContext, 'id' | 'created_at' | 'updated_at'>>;
      };
      templates: {
        Row: Template;
        Insert: Omit<Template, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Template, 'id' | 'created_at' | 'updated_at'>>;
      };
      usage_events: {
        Row: UsageEvent;
        Insert: Omit<UsageEvent, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<UsageEvent, 'id' | 'created_at'>>;
      };
      user_template_favorites: {
        Row: UserTemplateFavorite;
        Insert: Omit<UserTemplateFavorite, 'created_at'> & {
          created_at?: string;
        };
        Update: Partial<Omit<UserTemplateFavorite, 'user_id' | 'template_id' | 'created_at'>>;
      };
      organization_invitations: {
        Row: OrganizationInvitation;
        Insert: Omit<OrganizationInvitation, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<OrganizationInvitation, 'id' | 'created_at' | 'updated_at'>>;
      };
      user_team_memberships: {
        Row: UserTeamMembership;
        Insert: Omit<UserTeamMembership, 'id' | 'created_at' | 'updated_at' | 'joined_at'> & {
          id?: string;
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<UserTeamMembership, 'id' | 'user_id' | 'team_id' | 'created_at' | 'updated_at' | 'joined_at'>>;
      };
      subscription_plans: {
        Row: SubscriptionPlan;
        Insert: Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>>;
      };
      user_subscriptions: {
        Row: UserSubscription;
        Insert: Omit<UserSubscription, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<UserSubscription, 'id' | 'created_at' | 'updated_at'>>;
      };
      token_usage_events: {
        Row: TokenUsageEvent;
        Insert: Omit<TokenUsageEvent, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<TokenUsageEvent, 'id' | 'created_at'>>;
      };
      billing_periods: {
        Row: BillingPeriod;
        Insert: Omit<BillingPeriod, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<BillingPeriod, 'id' | 'created_at' | 'updated_at'>>;
      };
      usage_quotas: {
        Row: UsageQuota;
        Insert: Omit<UsageQuota, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<UsageQuota, 'id' | 'created_at' | 'updated_at'>>;
      };
      jira_project_permissions: {
        Row: JiraProjectPermission;
        Insert: Omit<JiraProjectPermission, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<JiraProjectPermission, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}