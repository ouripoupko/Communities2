import { BarChart2, Star, FileText, Heart, MessageSquare, CalendarDays, KanbanSquare, AlertTriangle, HelpCircle, Award } from 'lucide-react';
import RankingFlow, { RankingSetupDialog } from './voting/RankingFlow';
import { rankingConstructor } from './voting/rankingApi';
import ScoringFlow, { ScoringSetupDialog } from './voting/ScoringFlow';
import { scoringConstructor } from './voting/scoringApi';
import DocFlow from './document/DocFlow';
import { documentConstructor } from './document/docApi';
import FundingFlow, { FundingSetupDialog } from './funding/FundingFlow';
import { fundingConstructor } from './funding/fundingApi';
import DiscussionFlow from './discussion/DiscussionFlow';
import SchedulingFlow, { SchedulingSetupDialog } from './scheduling/SchedulingFlow';
import { schedulingConstructor } from './scheduling/schedulingApi';
import TaskboardFlow from './taskboard/TaskboardFlow';
import ConcernsFlow from './concerns/ConcernsFlow';
import QAFlow from './qa/QAFlow';
import RolesFlow from './roles/RolesFlow';
import { sourceOf } from '../../../services/contracts/sources';
import type { FlowDefinition } from './types';

/** Ordered list of group names as they appear in the Add flow dialog. */
export const FLOW_GROUPS = [
  'Decision Making',
  'Planning & Execution',
  'Governance & Finance',
  'Communication',
] as const;

// Each flow is a contract (source) its creator deploys on their node, with
// constructorArgs from its setup dialog and from where it is (its title and
// community).
export const FLOW_REGISTRY: FlowDefinition[] = [
  // ── Decision Making ────────────────────────────────────────────────────────
  {
    id: 'ranking',
    label: 'Ranking Vote',
    icon: BarChart2,
    component: RankingFlow,
    group: 'Decision Making',
    setupComponent: RankingSetupDialog,
    source: sourceOf('RankingFlow.sol'),
    constructorArgs: rankingConstructor,
  },
  {
    id: 'scoring',
    label: 'Scoring Vote',
    icon: Star,
    component: ScoringFlow,
    group: 'Decision Making',
    setupComponent: ScoringSetupDialog,
    source: sourceOf('ScoringFlow.sol'),
    constructorArgs: scoringConstructor,
  },
  {
    id: 'concerns',
    label: 'Concern Resolution',
    icon: AlertTriangle,
    component: ConcernsFlow,
    group: 'Decision Making',
    source: sourceOf('ConcernsFlow.sol'),
  },

  // ── Planning & Execution ───────────────────────────────────────────────────
  {
    id: 'scheduling',
    label: 'Scheduling',
    icon: CalendarDays,
    component: SchedulingFlow,
    group: 'Planning & Execution',
    setupComponent: SchedulingSetupDialog,
    source: sourceOf('SchedulingFlow.sol'),
    constructorArgs: schedulingConstructor,
  },
  {
    id: 'task-board',
    label: 'Task Board',
    icon: KanbanSquare,
    component: TaskboardFlow,
    group: 'Planning & Execution',
    source: sourceOf('TaskBoardFlow.sol'),
  },
  {
    id: 'roles',
    label: 'Role Nomination',
    icon: Award,
    component: RolesFlow,
    group: 'Planning & Execution',
    source: sourceOf('RolesFlow.sol'),
  },

  // ── Governance & Finance ───────────────────────────────────────────────────
  {
    id: 'funding',
    label: 'Funding',
    icon: Heart,
    component: FundingFlow,
    group: 'Governance & Finance',
    setupComponent: FundingSetupDialog,
    source: sourceOf('FundingFlow.sol'),
    constructorArgs: fundingConstructor,
  },

  // ── Communication ──────────────────────────────────────────────────────────
  {
    id: 'discussion',
    label: 'Discussion',
    icon: MessageSquare,
    component: DiscussionFlow,
    group: 'Communication',
    source: sourceOf('DiscussionFlow.sol'),
  },
  {
    id: 'qa',
    label: 'Q&A',
    icon: HelpCircle,
    component: QAFlow,
    group: 'Communication',
    source: sourceOf('QAFlow.sol'),
  },
  {
    id: 'document',
    label: 'Document',
    icon: FileText,
    component: DocFlow,
    group: 'Communication',
    source: sourceOf('DocumentFlow.sol'),
    constructorArgs: documentConstructor,
  },
];

export function getFlow(id: string): FlowDefinition | undefined {
  return FLOW_REGISTRY.find((f) => f.id === id);
}
