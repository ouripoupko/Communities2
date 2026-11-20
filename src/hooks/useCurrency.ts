import { useCallback, useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchCurrency } from '../store/slices/currencySlice';
import { useEventStream } from './useEventStream';
import { getMemberDisplayName } from '../utils/memberDisplay';
import type { Account } from '../services/contracts/community';
import type { IProfile } from '../services/interfaces';

/** A label for an account: its member's name, or its fund's name. */
export function accountLabel(account: Account | undefined, profiles: Record<string, IProfile>): string {
  if (!account) return 'unknown account';
  return account.kind === 'personal' ? getMemberDisplayName(profiles[account.owner]) : account.name;
}

/**
 * A community's currency, for the pages that show it: loads it, and again
 * whenever the community changes. Dialogs inside those pages read the store.
 */
export function useCurrency(communityId: string) {
  const dispatch = useAppDispatch();
  const { communityAccounts, communityPolicies, communityCurrency, currencyLoading } = useAppSelector((state) => state.currency);
  const { profiles } = useAppSelector((state) => state.communities);

  const reload = useCallback(() => {
    if (communityId) dispatch(fetchCurrency({ contractId: communityId }));
  }, [communityId, dispatch]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEventStream('contract_write', useCallback((event) => {
    if (event.contract === communityId) reload();
  }, [communityId, reload]));

  const accounts = useMemo(() => communityAccounts[communityId] ?? [], [communityAccounts, communityId]);
  const labels = useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.id, accountLabel(a, profiles)])) as Record<string, string>,
    [accounts, profiles],
  );

  return {
    accounts,
    labels,
    policies: communityPolicies[communityId] ?? [],
    currency: communityCurrency[communityId] ?? null,
    loading: currencyLoading[communityId] === true,
    reload,
  };
}
