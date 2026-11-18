import type { Account, IPolicySide } from '../../../services/contracts/community';

export function describeSide(
  side: IPolicySide,
  isSource: boolean,
  resolveAccountLabel: (id: string) => string,
): string {
  switch (side.kind) {
    case 'void':
      return isSource ? 'Mint' : 'Burn';
    case 'everyPersonal':
      return "every member's personal account";
    case 'everyAccount':
      return 'every account in the community';
    case 'account':
      return side.account ? resolveAccountLabel(side.account) : 'unknown account';
    default:
      return 'unknown';
  }
}

/** An amount of the currency, with two decimals. */
export function formatAmount(amount: number): string {
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatRate(mode: 'units' | 'percent', rate: number): string {
  return mode === 'percent'
    ? `${rate.toLocaleString(undefined, { maximumFractionDigits: 4 })}% per day`
    : `${formatAmount(rate)} per day`;
}

/** How many of the community's accounts a policy's side names now (0 for minting or burning). */
export function sideCount(side: IPolicySide, accounts: Account[]): number {
  switch (side.kind) {
    case 'account':
      return 1;
    case 'everyPersonal':
      return accounts.filter((a) => a.kind === 'personal').length;
    case 'everyAccount':
      return accounts.length;
    default:
      return 0;
  }
}
