export interface TemplateStructure {
  titleFormat: string;
  descriptionFormat: string;
  acceptanceCriteriaFormat: string;
  additionalFields: Array<{ fieldName: string; fieldType: string; fieldValue: string }>;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  structure: TemplateStructure;
  visibility_scope: 'global' | 'organization' | 'team' | 'private';
  team_id?: string;
  organization_id?: string;
  isPublic: boolean; // Keep for backward compatibility
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // lastUsed?: string; // Removed
  // usageCount?: number; // Removed
  // isFavorite is user-specific, managed in UI state, not part of core template data
}

export const TEMPLATE_CATEGORIES = [
  'All',
  'General',
  'Bug Report',
  'Feature Request',
  'User Story',
  'Task',
  'Documentation',
  'Meeting Notes',
  'Onboarding',
  'Offboarding',
  'Incident Report',
  'Change Request',
  'Test Case',
];

export const MOCK_TEMPLATES: Template[] = [
  {
    id: '1',
    name: 'Standard Bug Report',
    description: 'A comprehensive template for reporting software bugs, including steps to reproduce, expected vs. actual results, and environment details.',
    category: 'Bug Report',
    tags: ['bug', 'issue', 'defect', 'testing'],
    visibility_scope: 'global',
    structure: {
      titleFormat: 'Bug: {Short Description of the Bug}',
      descriptionFormat:
        '**Steps to Reproduce:**\n1. {Action 1}\n2. {Action 2}\n3. {Action 3}\n\n**Expected Result:**\n{What should have happened}\n\n**Actual Result:**\n{What actually happened}\n\n**Environment:**\n- OS: {Operating System}\n- Browser: {Browser Name & Version}\n- Device: {Device Type/Model}\n\n**Additional Context:**\n{Any other relevant information}',
      acceptanceCriteriaFormat:
        '- {Confirmation that bug is fixed}\n- {Related functionalities are unaffected}',
      additionalFields: [
        { fieldName: 'Severity', fieldType: 'select', fieldValue: 'Medium' },
        { fieldName: 'Priority', fieldType: 'select', fieldValue: 'High' },
      ],
    },
    visibility_scope: 'global',
    visibility_scope: 'global',
    isPublic: true,
    createdBy: 'Admin',
    createdAt: '2024-05-01T10:00:00Z',
    updatedAt: '2024-05-15T11:30:00Z',
  },
  {
    id: '2',
    name: 'New Feature Request',
    description: 'Template for proposing new features, outlining the problem, proposed solution, and benefits.',
    category: 'Feature Request',
    tags: ['feature', 'enhancement', 'product'],
    structure: {
      titleFormat: 'Feature: {Concise Feature Title}',
      descriptionFormat:
        '**Problem Statement:**\n{Describe the problem this feature solves or the opportunity it addresses}\n\n**Proposed Solution:**\n{Detail the suggested feature and how it works}\n\n**User Stories / Use Cases:**\n- As a {User Role}, I want {Goal} so that {Benefit}.\n\n**Benefits:**\n{List the key benefits of implementing this feature}\n\n**Success Metrics:**\n{How will the success of this feature be measured?}',
      acceptanceCriteriaFormat:
        '- {Core functionality is implemented as described}\n- {Meets specified performance and usability standards}\n- {Documentation is updated}',
      additionalFields: [
        { fieldName: 'Target Release', fieldType: 'text', fieldValue: '' },
      ],
    },
    visibility_scope: 'global',
    isPublic: true,
    createdBy: 'Product Team',
    createdAt: '2024-05-02T14:00:00Z',
    updatedAt: '2024-05-10T09:20:00Z',
  },
  {
    id: '3',
    name: 'Agile User Story',
    description: 'A standard user story format for agile development, focusing on user roles, goals, and reasons.',
    category: 'User Story',
    tags: ['agile', 'scrum', 'user story'],
    structure: {
      titleFormat: 'User Story: {Short Description}',
      descriptionFormat:
        'As a **{User Role/Persona}**,\nI want to **{Perform an Action/Achieve a Goal}**,\nSo that **{I can get a specific Benefit/Value}**.\n\n**Additional Details:**\n{Any clarifications, technical notes, or UI/UX considerations}',
      acceptanceCriteriaFormat:
        '**Scenario 1: {Scenario Name}**\n- Given {Context/Preconditions}\n- When {Action(s) are performed}\n- Then {Expected Outcome(s)}\n\n**Scenario 2: {Another Scenario}**\n- ...',
      additionalFields: [
        { fieldName: 'Story Points', fieldType: 'number', fieldValue: '0' },
      ],
    },
    visibility_scope: 'organization',
    isPublic: false,
    createdBy: 'Scrum Master',
    createdAt: '2024-04-20T16:00:00Z',
    updatedAt: '2024-05-18T12:00:00Z',
  },
  {
    id: '4',
    name: 'Technical Task Breakdown',
    description: 'Template for breaking down larger technical tasks into smaller, manageable sub-tasks.',
    category: 'Task',
    tags: ['technical', 'development', 'sub-task'],
    structure: {
      titleFormat: 'Task: {Specific Technical Objective}',
      descriptionFormat:
        '**Overall Goal:**\n{Link to parent story/feature or describe the high-level objective}\n\n**Task Description:**\n{Detailed explanation of what needs to be done}\n\n**Technical Approach:**\n{Outline the proposed technical solution, components involved, etc.}\n\n**Dependencies:**\n{List any other tasks or external factors this task depends on}',
      acceptanceCriteriaFormat:
        '- {Sub-task 1 completed and verified}\n- {Sub-task 2 completed and verified}\n- {Code reviewed and merged}\n- {Unit tests pass}',
      additionalFields: [
        { fieldName: 'Estimated Hours', fieldType: 'number', fieldValue: '0' },
        { fieldName: 'Assigned To', fieldType: 'text', fieldValue: '' },
      ],
    },
    visibility_scope: 'organization',
    isPublic: false,
    createdBy: 'Tech Lead',
    createdAt: '2024-05-05T11:00:00Z',
    updatedAt: '2024-05-12T15:45:00Z',
  },
  {
    id: '5',
    name: 'Documentation Update Request',
    description: 'A template for requesting updates or additions to project documentation.',
    category: 'Documentation',
    tags: ['docs', 'content', 'update'],
    structure: {
      titleFormat: 'Docs: {Area to Update} - {Brief Summary of Change}',
      descriptionFormat:
        '**Documentation Page/Section:**\n{Link or path to the specific documentation page or section}\n\n**Reason for Update:**\n{Explain why the update is needed (e.g., outdated information, new feature, error correction)}\n\n**Requested Changes:**\n{Clearly describe the content to be added, removed, or modified. Provide new text if possible.}\n\n**Source of Information (if applicable):**\n{Link to design documents, PRs, or other relevant sources}',
      acceptanceCriteriaFormat:
        '- {Documentation is updated accurately as per the request}\n- {Changes are reviewed and approved by relevant stakeholders}\n- {Updated documentation is published/accessible}',
      additionalFields: [],
    },
    visibility_scope: 'global',
    isPublic: true,
    createdBy: 'QA Team',
    createdAt: '2024-05-10T09:00:00Z',
    updatedAt: '2024-05-20T17:00:00Z',
  },
];
