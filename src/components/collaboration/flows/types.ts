import type React from 'react';

export interface FlowProps {
  instanceId: string;
  collaborationId: string;
  collaborationType: 'initiative' | 'wish' | 'agreement';
  /** Parent contract ID for shared contract mode (e.g. the initiative contract) */
  parentContractId?: string;
  /** Key under parent's details where the sub-contract info is stored */
  stageKey?: string;
}

export interface FlowDefinition {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  component: React.ComponentType<FlowProps>;
  /** Group name shown as a section header in the Add Tab menu */
  group?: string;
  /** Return false to disable this flow in the Add menu given the current set of open tab flow-ids */
  isAvailable?: (existingFlowIds: string[]) => boolean;
}
