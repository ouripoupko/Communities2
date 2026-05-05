import { BarChart2, Star, FileText, Heart, MessageSquare, CalendarDays, KanbanSquare, AlertTriangle, HelpCircle, Award } from 'lucide-react';
import RankingFlow from './voting/RankingFlow';
import ScoringFlow from './voting/ScoringFlow';
import DocFlow from './document/DocFlow';
import FundingFlow, { FundingSetupDialog } from './funding/FundingFlow';
import { configureFund } from './funding/fundingApi';
import type { FundConfig } from './funding/fundingApi';
import { contractWrite } from '../../../services/api';
import type { IMethod } from '../../../services/interfaces';
import DiscussionFlow from './discussion/DiscussionFlow';
import SchedulingFlow, { SchedulingSetupDialog } from './scheduling/SchedulingFlow';
import { setupRange } from './scheduling/schedulingApi';
import type { RangeConfig } from './scheduling/schedulingApi';
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
    id: 'funding',
    label: 'Funding',
    icon: Heart,
    component: FundingFlow,
    group: 'Governance & Finance',
    setupComponent: FundingSetupDialog,
    onInit: async (server, agent, contractId, config, _currentUser) => {
      const { name, description, goal } = config as unknown as FundConfig;
      const community = config._community as { server: string; agent: string; id: string } | null;
      await configureFund(server, agent, contractId, name, description ?? '', goal ?? null);
      if (community?.id) {
        await contractWrite({
          serverUrl: server, publicKey: agent, contractId,
          method: { name: 'set_community_and_fund', values: {
            community_server: community.server,
            community_agent:  community.agent,
            community_id:     community.id,
            fund_account_name: name,
          } } as IMethod,
        });
        await contractWrite({
          serverUrl: community.server, publicKey: agent, contractId: community.id,
          method: { name: 'create_fund_account', values: { name, owner: agent } } as IMethod,
        });
      }
    },
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
