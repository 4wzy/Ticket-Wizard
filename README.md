# TicketWizard

TicketWizard is an AI-powered application that helps teams create and refine high-quality Jira tickets efficiently. It includes both manual editing tools with AI refinement and guided AI-assisted workflows.

---

## Features

- **Manual Mode** – Traditional ticket editing with AI refinement  
- **Guided Mode** – Step-by-step AI-assisted ticket creation with interactive chat  
- **Usage Analytics** – Dashboards for individuals, teams, and organizations  
- **Team & Organization Management** – Role-based access, invitations, and administration  
- **Template & Project Context System** – Reusable structures with visibility levels (private, team, org, global)  
- **INVEST Score Analysis** – AI-powered scoring system to evaluate ticket quality against INVEST criteria  
- **Version Control for Tickets** – Maintain multiple refinements and revert to previous versions  
- **Polished UI/UX** – Glassmorphism, animations, and custom cursor effects  

---

## Project Structure

### Core Pages
- `/src/app/manual-mode/page.tsx` – Manual ticket editing interface  
- `/src/app/guided-mode/page.tsx` – AI-guided ticket creation  
- `/src/app/usage/page.tsx` – Individual usage dashboard  
- `/src/app/team-admin/page.tsx` – Team analytics and admin tools  
- `/src/app/org-admin/page.tsx` – Organization analytics and admin tools  

### Components
- `/src/app/components/` – Reusable UI components (e.g. `CollapsibleSidebar`, `NavHelper`)  
- `/src/components/` – Feature-level components (`UsageStats`, `TeamUsageOverview`, `OrganizationUsageOverview`, `InvestScore`, etc.)  

### API Routes
- `/src/app/api/refine` – AI refinement (manual mode)  
- `/src/app/api/chat` – AI interactive chat (manual mode)  
- `/src/app/api/guided-refine/assess` – Guided mode ticket assessment  
- `/src/app/api/usage/` – Usage analytics endpoints  
- `/src/app/api/organizations/` – Organization management  
- `/src/app/api/teams/` – Team management  
- `/src/app/api/invitations/` – Invitation system  
- `/src/app/api/project-contexts/` – Project context CRUD  
- `/src/app/api/templates/` – Template CRUD  

### Utilities & Config
- `/src/app/globals.css` – Global styles & animations  
- `/src/lib/` – Utilities (API client, Supabase server helpers, database)  
- `/src/context/` – React contexts (e.g. `AuthContext`)  
- `/src/types/` – TypeScript type definitions  

---

## Authentication & Authorization

The application uses **Supabase** for authentication and database access with **Row Level Security (RLS)**.

### Client-side
- `AuthContext.tsx` – Session & role-based access management  
- `useAuth()` – Exposes user state, memberships, and role checks  
- Use `authenticatedFetch()` from `@/lib/api-client` for all authenticated API calls (never plain `fetch()`)  

### Server-side
- `getAuthenticatedUser()` – Retrieves the current user (RLS-compliant)  
- `createSupabaseAdmin()` – Admin client (only after explicit permission validation)  
- `createSupabaseServerClient()` – For SSR with cookie-based authentication  

### Roles
- **Organization**: `org_admin`, `member`  
- **Team**: `team_admin`, `member`, `viewer`  

---

## Database Overview

Backed by **Supabase PostgreSQL**, with RLS enforcing isolation.

**Key tables:**
- `user_profiles` – Authentication & profiles  
- `organizations`, `teams`, `user_team_memberships` – Access hierarchy  
- `project_contexts` – Contexts with visibility levels  
- `templates` – Reusable ticket structures  
- `token_usage_events` – Usage analytics tracking  

**Visibility levels:**
- **Private** – Creator only  
- **Team** – Specific team members  
- **Organization** – Entire org  
- **Global** – Org admins & creator  

---

## Usage Analytics

- **Individual**: Token usage history, feature breakdowns, 30-day trends  
- **Team**: Token consumption, leaderboards, daily trends  
- **Organization**: Aggregated usage across teams, adoption insights  

**UI Components:**
- `UsageStats.tsx` – Individual dashboard  
- `TeamUsageOverview.tsx` – Team analytics  
- `OrganizationUsageOverview.tsx` – Org analytics  

---

## INVEST Scoring System

Component: `InvestScore.tsx`

**Criteria tracked:**
- Independent, Negotiable, Valuable, Estimable, Small, Testable  

**Features:**
- Interactive tooltips with reasoning  
- Color-coded breakdown & progress bars  
- Integration with guided/manual editors and versioned tickets  

---

## Development

### Getting Started

First, install dependencies:

```bash
npm install
```

Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open http://localhost:3000 with your browser.
Build
```bash
npm run build
```
## Project Conventions

- **Pages**: `page.tsx` in directory structure  
- **Components**: PascalCase  
- **APIs**: `route.ts` in `/api`  
- **Styling**: Tailwind CSS + custom animations  

---

## Key Dependencies

- [Next.js 15.3.2](https://nextjs.org) – Framework  
- React – UI library  
- Tailwind CSS – Styling  
- Supabase – Authentication & Database  
- Google Generative AI – AI integration (Gemini 2.5 Flash)  
- Heroicons – Icons  

---

## Current Status

✅ Authentication with Supabase & RLS  
✅ Usage analytics (individual/team/org)  
✅ Team & organization management  
✅ Templates & project contexts with visibility controls  
✅ INVEST scoring system  
✅ Polished UI/UX with animations  

---

## Future Work

- Add testing framework  
- Improve performance monitoring  
- Mobile UI optimization  
- Deeper analytics & reporting  
- Billing integration  

---

## Deployment

The easiest way to deploy a Next.js app is via [Vercel](https://vercel.com).  
See the [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
