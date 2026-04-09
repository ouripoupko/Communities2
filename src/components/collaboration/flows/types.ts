import type React from 'react';

export interface FlowProps {
  /** Contract id of this flow on the owner's server */
  instanceId: string;
  /** Server URL where the flow contract is deployed */
  flowServer: string;
  /** Public key of the agent who owns the flow contract */
  flowAgent: string;
  /** Current authenticated user's public key */
  currentUser: string;
  collaborationId: string;
  collaborationType: 'initiative' | 'wish' | 'agreement';
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
  /**
   * If defined, this dialog is shown before the tab is created.
   * onDone receives the config; onCancel aborts tab creation.
   */
  setupComponent?: React.ComponentType<{
    onDone: (config: Record<string, unknown>) => void;
    onCancel: () => void;
  }>;
  /**
   * Called after deploying the flow contract, with the config from setupComponent.
   */
  onInit?: (
    server: string,
    agent: string,
    contractId: string,
    config: Record<string, unknown>,
    currentUser: string,
  ) => Promise<void>;
}
