/**
 * Initiative types - shared between Collaborations and InitiativeView.
 * Initiatives will be implemented as smart contracts on the owner's server (like issues).
 */

export interface InitiativeData {
  id: string;
  title: string;
  description?: string;
  currencyGathered?: number;
  currencyGoal?: number;
  createdAt: number;
  activityCount?: number;
  /** Owner's server URL - "local" for locally-created initiatives */
  hostServer?: string;
  /** Owner's public key */
  hostAgent?: string;
}
