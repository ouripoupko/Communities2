import { contractRead, contractWrite } from '../api';
import type { IMethod } from '../interfaces';

/**
 * Wish contract interface
 * Handles all wish-specific contract calls
 */

export async function getWish(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'get_wish',
      values: {},
    } as IMethod,
  });
}

export async function setTitle(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  title: string,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'set_title',
      values: { title },
    } as IMethod,
  });
}

export async function setDreamNeed(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  dreamNeed: string,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'set_dream_need',
      values: { dream_need: dreamNeed },
    } as IMethod,
  });
}

export async function setCreatedAt(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  createdAt: number,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'set_created_at',
      values: { created_at: createdAt },
    } as IMethod,
  });
}

/**
 * Add a related wish to this wish's related list.
 * Called on the current wish contract (contractId = wishId).
 */
export async function addRelatedWish(
  serverUrl: string,
  publicKey: string,
  wishContractId: string,
  relatedWishId: string,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId: wishContractId,
    method: {
      name: 'add_related_wish',
      values: { related_wish_id: relatedWishId },
    } as IMethod,
  });
}

/**
 * Get related wish IDs for this wish.
 * Called on the wish contract (contractId = wishId).
 */
export async function getRelatedWishes(
  serverUrl: string,
  publicKey: string,
  wishContractId: string,
) {
  const result = await contractRead({
    serverUrl,
    publicKey,
    contractId: wishContractId,
    method: {
      name: 'get_related_wishes',
      values: {},
    } as IMethod,
  });
  return Array.isArray(result) ? result : [];
}

export interface WishOffer {
  id: string;
  author: string;
  description: string;
  createdAt: number;
  acceptedBy?: string | null;
  acceptedAt?: number | null;
  compensated?: boolean;
}

/**
 * Add a help offer to this wish.
 */
export async function addOffer(
  serverUrl: string,
  publicKey: string,
  wishContractId: string,
  description: string,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId: wishContractId,
    method: {
      name: 'add_offer',
      values: { description },
    } as IMethod,
  });
}

/**
 * Get all offers for this wish.
 */
export async function getOffers(
  serverUrl: string,
  publicKey: string,
  wishContractId: string,
): Promise<WishOffer[]> {
  const result = await contractRead({
    serverUrl,
    publicKey,
    contractId: wishContractId,
    method: {
      name: 'get_offers',
      values: {},
    } as IMethod,
  });
  if (!Array.isArray(result)) return [];
  return result.map((o: Record<string, unknown>) => ({
    id: String(o.id ?? ''),
    author: String(o.author ?? ''),
    description: String(o.description ?? ''),
    createdAt: Number(o.createdAt ?? 0),
    acceptedBy: (o.acceptedBy as string) ?? null,
    acceptedAt: (o.acceptedAt as number) ?? null,
    compensated: Boolean(o.compensated ?? false),
  }));
}

/**
 * Accept an offer (caller becomes the accepter).
 */
export async function acceptOffer(
  serverUrl: string,
  publicKey: string,
  wishContractId: string,
  offerId: string,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId: wishContractId,
    method: {
      name: 'accept_offer',
      values: { offer_id: offerId },
    } as IMethod,
  });
}

/**
 * Mark an offer as compensated (call after transfer).
 */
export async function compensateOffer(
  serverUrl: string,
  publicKey: string,
  wishContractId: string,
  offerId: string,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId: wishContractId,
    method: {
      name: 'compensate_offer',
      values: { offer_id: offerId },
    } as IMethod,
  });
}

export interface WishSeed {
  id: string;
  author: string;
  description: string;
  createdAt: number;
  initiativeId?: string | null;
  hostServer?: string | null;
  hostAgent?: string | null;
}

/**
 * Add a collaboration idea (seed) to this wish.
 */
export async function addSeed(
  serverUrl: string,
  publicKey: string,
  wishContractId: string,
  description: string,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId: wishContractId,
    method: {
      name: 'add_seed',
      values: { description },
    } as IMethod,
  });
}

/**
 * Get all seeds (collaboration ideas) for this wish.
 */
export async function getSeeds(
  serverUrl: string,
  publicKey: string,
  wishContractId: string,
): Promise<WishSeed[]> {
  const result = await contractRead({
    serverUrl,
    publicKey,
    contractId: wishContractId,
    method: {
      name: 'get_seeds',
      values: {},
    } as IMethod,
  });
  if (!Array.isArray(result)) return [];
  return result.map((s: Record<string, unknown>) => ({
    id: String(s.id ?? ''),
    author: String(s.author ?? ''),
    description: String(s.description ?? ''),
    createdAt: Number(s.createdAt ?? 0),
    initiativeId: (s.initiativeId as string) ?? null,
    hostServer: (s.hostServer as string) ?? null,
    hostAgent: (s.hostAgent as string) ?? null,
  }));
}

/**
 * Link a seed to an initiative (call after creating the initiative).
 */
export async function launchSeed(
  serverUrl: string,
  publicKey: string,
  wishContractId: string,
  seedId: string,
  initiativeId: string,
  hostServer: string,
  hostAgent: string,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId: wishContractId,
    method: {
      name: 'launch_seed',
      values: {
        seed_id: seedId,
        initiative_id: initiativeId,
        host_server: hostServer,
        host_agent: hostAgent,
      },
    } as IMethod,
  });
}
