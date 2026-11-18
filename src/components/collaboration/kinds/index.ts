import type { Collaboration, CollaborationType } from '../../../services/contracts/community';
import type { CollaborationKind } from './kind';
import { initiative } from './initiative';
import { wish } from './wish';
import { agreement } from './agreement';

export type { CollaborationKind, CollaborationPageProps, FieldSpec } from './kind';

/** Every kind of collaboration, in the order the community shows them. */
export const COLLABORATION_KINDS: CollaborationKind[] = [initiative, wish, agreement];

const byType: Record<CollaborationType, CollaborationKind> = { initiative, wish, agreement };

export const kindOf = (type: CollaborationType): CollaborationKind => byType[type];

/** A collaboration's page. The path holds its host, through whom others join it. */
export const collaborationPath = (c: Pick<Collaboration, 'type' | 'id' | 'hostServer' | 'hostAgent'>): string =>
  `/${c.type}/${encodeURIComponent(c.hostServer)}/${encodeURIComponent(c.hostAgent)}/${encodeURIComponent(c.id)}`;
