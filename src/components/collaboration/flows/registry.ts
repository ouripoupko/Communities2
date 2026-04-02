import { FileText, Heart, MessageSquare, CalendarDays, PieChart, KanbanSquare, AlertTriangle, HelpCircle, Award, ThumbsUp } from 'lucide-react';
// RankingFlow and ScoringFlow imports removed — will be replaced by ApprovalFlow and QVFlow
import ApprovalFlow from './voting/ApprovalFlow';
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
  'Planning & Execution',
  'Governance & Finance',
  'Communication',
] as const;

export const FLOW_REGISTRY: FlowDefinition[] = [
  // ── Decision Making ────────────────────────────────────────────────────────
  {
    id: 'approval',
    label: 'Approval Voting',
    icon: ThumbsUp,
    component: ApprovalFlow,
    group: 'Decision Making',
  },
  // QVFlow will be added here in Task 8
  {
    id: 'concerns',
    label: 'Concern Resolution',
    icon: AlertTriangle,
    component: ConcernsFlow,
    group: 'Decision Making',
  },

  // ── Planning & Execution ───────────────────────────────────────────────────
  {
    id: 'scheduling',
    label: 'Scheduling',
    icon: CalendarDays,
    component: SchedulingFlow,
    group: 'Planning & Execution',
  },
  {
    id: 'task-board',
    label: 'Task Board',
    icon: KanbanSquare,
    component: TaskboardFlow,
    group: 'Planning & Execution',
  },
  {
    id: 'roles',
    label: 'Role Nomination',
    icon: Award,
    component: RolesFlow,
    group: 'Planning & Execution',
  },

  // ── Governance & Finance ───────────────────────────────────────────────────
  {
    id: 'fundraising',
    label: 'Fundraising',
    icon: Heart,
    component: FundraisingFlow,
    group: 'Governance & Finance',
  },
  {
    id: 'budget-allocation',
    label: 'Budget Allocation',
    icon: PieChart,
    component: BudgetFlow,
    group: 'Governance & Finance',
    isAvailable: () => hasAvailableFunds(),
  },

  // ── Communication ──────────────────────────────────────────────────────────
  {
    id: 'discussion',
    label: 'Discussion',
    icon: MessageSquare,
    component: DiscussionFlow,
    group: 'Communication',
  },
  {
    id: 'qa',
    label: 'Q&A',
    icon: HelpCircle,
    component: QAFlow,
    group: 'Communication',
  },
  {
    id: 'document',
    label: 'Document',
    icon: FileText,
    component: DocFlow,
    group: 'Communication',
  },
];

export function getFlow(id: string): FlowDefinition | undefined {
  return FLOW_REGISTRY.find((f) => f.id === id);
}
