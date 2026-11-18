import type React from 'react';
import type { Sources } from '../../../services/ibc';

export interface FlowProps {
  /** Contract id of this flow on the owner's server */
  instanceId: string;
  /** Public key of the agent who owns the flow contract */
  flowAgent: string;
  /** Current authenticated user's public key */
  currentUser: string;
}

/** Where a new flow is: its title, and its collaboration's community. */
export interface FlowContext {
  title: string;
  communityId: string;
}

export interface FlowDefinition {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  component: React.ComponentType<FlowProps>;
  /** Group name shown as a section header in the Add flow dialog */
  group?: string;
  /**
   * If defined, this dialog is shown before the flow is created.
   * onDone receives the config; onCancel aborts creating it.
   */
  setupComponent?: React.ComponentType<{
    onDone: (config: Record<string, unknown>) => void;
    onCancel: () => void;
  }>;
  /**
   * The flow contract's Solidity source. A flow without one is not on the new
   * ibc node yet: it cannot be added.
   */
  source?: Sources;
  /**
   * The flow contract's constructor arguments: from setupComponent's config,
   * and the flow's title and community.
   */
  constructorArgs?: (config: Record<string, unknown>, context: FlowContext) => Record<string, unknown>;
}
