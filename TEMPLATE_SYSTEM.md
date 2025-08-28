# Template System Documentation

## Overview

The Ticket Wizard template system has been updated to use structure/format templates instead of pre-filled content examples. Templates now provide scaffolding layouts with placeholders (e.g., "{Why this exists}", "{Stakeholder name}") that guide users and AI to maintain consistency across teams.

## Template Structure

Templates now follow a structure-based format with the following properties:

```typescript
interface Template {
  id: string;
  name: string;            // Previously 'title'
  description: string;
  category: string;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;       // New property
  isPublic: boolean;
  isFavorite: boolean;
  structure: {             // Previously 'content'
    titleFormat: string;
    descriptionFormat: string;
    acceptanceCriteriaFormat: string;
    additionalFields?: { [key: string]: string };
  };
}
```

## How Templates Work

1. **Template Selection**: Users browse and select a template from the Templates page.
2. **Structure Guidance**: Selected template provides a structure with placeholders for the ticket.
3. **AI Refinement**: When refining with AI, the template structure is used as guidance for formatting.

## Template Format Example

Templates use placeholders in the format `{placeholder_name}` to indicate where user content should be inserted:

```
**Business Value**
{Why this feature is important to the business}

**User Story**
As a {user_type}, I want {functionality} so that {benefit}.
```

## AI Refinement with Templates

When a user uses "Refine with AI" on a ticket:

1. The current ticket content (title, description, acceptance criteria) is sent to the refinement API
2. The template structure is also sent to guide the refinement
3. The API uses the template structure to format the content while preserving the user's intent
4. The refiner ensures the final content follows the template's structure

## Dashboard Integration

The dashboard integration has been updated to:

1. Accept template structures instead of pre-populated content
2. Set template structures as guidance for AI refinement
3. Present templates as formatting instructions rather than content population

## Placeholder Format

Template placeholders follow these conventions:

- Use curly braces: `{like_this}`
- Use underscores for multi-word placeholders: `{user_story_summary}`
- Use descriptive names: `{business_justification}`
- Indicate optional sections with placeholders: `{optional_metrics_if_available}`

## Benefits of Structure-Based Templates

1. **Consistency**: Ensures consistent format across teams
2. **Guidance**: Provides structure without dictating content
3. **Flexibility**: Users can adapt templates to their specific needs
4. **AI Enhancement**: AI can refine content while preserving organizational structure

## Template Categories

Templates are organized into categories:
- User Stories
- Bug Reports
- Feature Requests
- Technical Tasks
- Research & Discovery
- Documentation
- Testing & QA
- DevOps & Infrastructure
- Custom
