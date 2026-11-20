import type React from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Collaboration, CollaborationFields, CollaborationType } from '../../../services/contracts/community';
import type { CollaborationInfo } from '../../../services/contracts/flows';

/** A text the create dialog asks for, and which of the collaboration's texts it fills. */
export interface FieldSpec {
  slot: keyof CollaborationFields;
  label: string;
  placeholder: string;
  /** The message when it is left empty; optional when absent. */
  required?: string;
  /** A one-line input, or a text area of this many rows. */
  rows?: number;
}

/** What the collaboration page needs: which collaboration, and what the list told of it. */
export interface CollaborationPageProps {
  kind: CollaborationKind;
  collaborationId: string;
  /** The collaboration's host (its creator's node and agent), through whom others join it. */
  hostServer: string;
  hostAgent: string;
  /** As the community listed it, when the user came from there. */
  listed?: Collaboration;
  /** Community id for back-navigation. If omitted, read from the collaboration's contract. */
  communityId?: string;
}

/**
 * A kind of collaboration: what sets it apart from the others. The generic
 * code (the create dialog, the card, the page, the routes) reads it, so
 * each kind says only how it differs, and defineKind fills in the rest.
 */
export interface CollaborationKind {
  type: CollaborationType;
  /** "Initiative" */
  label: string;
  icon: LucideIcon;
  /** The create button's and the create dialog's title: "Start Initiative" */
  createLabel: string;
  /** The create dialog's submit button. Default: createLabel. */
  submitLabel: string;
  /** What the create dialog asks for. */
  fields: FieldSpec[];
  /** The card's line under the title. Default: the description. */
  summary: (c: Collaboration) => string;
  /** The collaboration page's line under the title, from its contract. Default: none. */
  subtitle?: (info: CollaborationInfo) => string;
  /** Its own page. Default: the generic collaboration page. */
  Page?: React.ComponentType<CollaborationPageProps>;
}

type KindSpec = Pick<CollaborationKind, 'type' | 'label' | 'icon' | 'createLabel' | 'fields'> & Partial<CollaborationKind>;

/** A kind, with the defaults for what it does not set. */
export function defineKind(spec: KindSpec): CollaborationKind {
  return {
    submitLabel: spec.createLabel,
    summary: (c) => c.description,
    ...spec,
  };
}
