export interface CollabTemplate {
  id: string;
  label: string;
  description: string;
  flowIds: string[];
}

export const COLLAB_TEMPLATES: CollabTemplate[] = [
  {
    id: 'event',
    label: 'Plan an Event',
    description: 'Scheduling, task board, and role assignment',
    flowIds: ['scheduling', 'task-board', 'roles'],
  },
  {
    id: 'project',
    label: 'Run a Project',
    description: 'Task board, collaborative document, and roles',
    flowIds: ['task-board', 'document', 'roles'],
  },
  {
    id: 'fundraise',
    label: 'Fundraise',
    description: 'Fundraising campaign with budget allocation',
    flowIds: ['fundraising', 'budget-allocation'],
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Start empty and add tools as needed',
    flowIds: [],
  },
];

export const COLLAB_FLOW_IDS = [
  'scheduling', 'task-board', 'roles', 'fundraising', 'budget-allocation', 'document',
];
