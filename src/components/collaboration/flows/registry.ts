import { BarChart2, Star, FileText, Heart, MessageSquare, CalendarDays, PieChart, KanbanSquare, AlertTriangle, HelpCircle, Award } from 'lucide-react';
import RankingFlow from './voting/RankingFlow';
import ScoringFlow from './voting/ScoringFlow';
import DocFlow from './document/DocFlow';
import FundraisingFlow, { FundraisingSetupDialog } from './fundraising/FundraisingFlow';
import { configureFund } from './fundraising/fundraisingApi';
import type { FundConfig } from './fundraising/fundraisingApi';
import DiscussionFlow from './discussion/DiscussionFlow';
import SchedulingFlow, { SchedulingSetupDialog } from './scheduling/SchedulingFlow';
import { setupRange } from './scheduling/schedulingApi';
import type { RangeConfig } from './scheduling/schedulingApi';
import BudgetFlow from './budget/BudgetFlow';
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
    id: 'ranking',
    label: 'Ranking Vote',
    icon: BarChart2,
    component: RankingFlow,
    group: 'Decision Making',
  },
  {
    id: 'scoring',
    label: 'Scoring Vote',
    icon: Star,
    component: ScoringFlow,
    group: 'Decision Making',
  },
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
    setupComponent: SchedulingSetupDialog,
    onInit: async (server, agent, contractId, config, currentUser) => {
      await setupRange(server, agent, contractId, config as Omit<RangeConfig, 'organizerId'>, currentUser);
    },
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
    setupComponent: FundraisingSetupDialog,
    onInit: async (server, agent, contractId, config, _currentUser) => {
      const { name, description, goal } = config as FundConfig;
      await configureFund(server, agent, contractId, name, description ?? '', goal ?? null);
    },
  },
  {
    id: 'budget-allocation',
    label: 'Budget Allocation',
    icon: PieChart,
    component: BudgetFlow,
    group: 'Governance & Finance',
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
