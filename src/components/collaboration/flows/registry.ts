import { FileText, Heart, MessageSquare, CalendarDays, PieChart, KanbanSquare, AlertTriangle, HelpCircle, Award, ThumbsUp, Scale } from 'lucide-react';
import ApprovalFlow from './voting/ApprovalFlow';
import QVFlow from './voting/QVFlow';
import DocFlow from './document/DocFlow';
import FundraisingFlow from './fundraising/FundraisingFlow';
import DiscussionFlow from './discussion/DiscussionFlow';
import SchedulingFlow from './scheduling/SchedulingFlow';
import BudgetFlow from './budget/BudgetFlow';
import { hasAvailableFunds } from './budget/budgetApi';
import TaskboardFlow from './taskboard/TaskboardFlow';
import ConcernsFlow from './concerns/ConcernsFlow';
import QAFlow from './qa/QAFlow';
import RolesFlow from './roles/RolesFlow';
import type { FlowDefinition } from './types';

/** Ordered list of group names as they appear in the Add Tab menu. */
export const FLOW_GROUPS = [
  'Decision Making',
  'Teamwork',
  'Planning',
  'Resources',
] as const;

export const FLOW_REGISTRY: FlowDefinition[] = [
  // ── Decision Making (initiative pipeline only) ────────────────────────────
  {
    id: 'approval',
    label: 'Approval Voting',
    icon: ThumbsUp,
    component: ApprovalFlow,
    group: 'Decision Making',
    context: 'initiative',
  },
  {
    id: 'quadratic',
    label: 'Quadratic Voting',
    icon: Scale,
    component: QVFlow,
    group: 'Decision Making',
    context: 'initiative',
  },
  {
    id: 'concerns',
    label: 'Concern Resolution',
    icon: AlertTriangle,
    component: ConcernsFlow,
    group: 'Decision Making',
    context: 'initiative',
  },

  // ── Teamwork ──────────────────────────────────────────────────────────────
  {
    id: 'discussion',
    label: 'Discussion',
    icon: MessageSquare,
    component: DiscussionFlow,
    group: 'Teamwork',
    context: 'collab',
  },
  {
    id: 'document',
    label: 'Shared Document',
    icon: FileText,
    component: DocFlow,
    group: 'Teamwork',
    context: 'collab',
  },
  {
    id: 'qa',
    label: 'Q&A',
    icon: HelpCircle,
    component: QAFlow,
    group: 'Teamwork',
    context: 'collab',
  },

  // ── Planning & Execution ──────────────────────────────────────────────────
  {
    id: 'task-board',
    label: 'Task Board',
    icon: KanbanSquare,
    component: TaskboardFlow,
    group: 'Planning',
    context: 'collab',
  },
  {
    id: 'scheduling',
    label: 'Scheduling',
    icon: CalendarDays,
    component: SchedulingFlow,
    group: 'Planning',
    context: 'collab',
  },
  {
    id: 'roles',
    label: 'Role Assignment',
    icon: Award,
    component: RolesFlow,
    group: 'Planning',
    context: 'collab',
  },

  // ── Resources ─────────────────────────────────────────────────────────────
  {
    id: 'fundraising',
    label: 'Fundraising',
    icon: Heart,
    component: FundraisingFlow,
    group: 'Resources',
    context: 'collab',
  },
  {
    id: 'budget-allocation',
    label: 'Budget Allocation',
    icon: PieChart,
    component: BudgetFlow,
    group: 'Resources',
    context: 'collab',
    isAvailable: (existingFlowIds: string[]) => existingFlowIds.includes('fundraising') && hasAvailableFunds(),
  },
];

export function getFlow(id: string): FlowDefinition | undefined {
  return FLOW_REGISTRY.find((f) => f.id === id);
}
