export interface CollabTemplate {
  id: string;
  label: string;
  description: string;
  flowIds: string[];
}

export const COLLAB_TEMPLATES: CollabTemplate[] = [
  {
    id: 'discuss',
    label: 'Open Discussion',
    description: 'A space for community dialogue, Q&A, and shared notes',
    flowIds: ['discussion', 'qa', 'document'],
  },
  {
    id: 'project',
    label: 'Community Project',
    description: 'Organize tasks, assign roles, and track progress together',
    flowIds: ['task-board', 'roles', 'document'],
  },
  {
    id: 'event',
    label: 'Plan an Event',
    description: 'Schedule, coordinate tasks, and assign responsibilities',
    flowIds: ['scheduling', 'task-board', 'roles'],
  },
  {
    id: 'fundraise',
    label: 'Community Fundraiser',
    description: 'Raise and allocate funds for community goals',
    flowIds: ['fundraising', 'budget-allocation', 'discussion'],
  },
  {
    id: 'custom',
    label: 'Custom Workspace',
    description: 'Start empty and add the tools your community needs',
    flowIds: [],
  },
];

export const COLLAB_FLOW_IDS = [
  'scheduling', 'task-board', 'roles', 'fundraising', 'budget-allocation', 'document',
];
