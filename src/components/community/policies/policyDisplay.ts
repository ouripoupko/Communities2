import type { IPolicySide } from '../../../services/contracts/community';

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

export function formatRate(mode: 'units' | 'percent', rate: number): string {
  return mode === 'percent' ? `${rate}% per tick` : `${rate} per tick`;
}
