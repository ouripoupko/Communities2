// Routes mock contract read/write calls to the right handler based on the
// contract's Python file name stored in the registry at deploy time.
import type { IMethod } from '../interfaces';
import { getDemoContract } from './demoRegistry';
import { communityRead, communityWrite } from './demoContracts/community';
import { initiativeRead, initiativeWrite } from './demoContracts/initiative';
import { problemVoteRead, problemVoteWrite } from './demoContracts/problemVote';
import { approvalRead, approvalWrite } from './demoContracts/approval';
import { qvRead, qvWrite } from './demoContracts/qv';
import { convictionRead, convictionWrite } from './demoContracts/conviction';
import { modificationRead, modificationWrite } from './demoContracts/modification';

type Handler = (contractId: string, method: IMethod, caller: string) => unknown;

const READ: Record<string, Handler> = {
  'community_contract.py': communityRead,
  'initiative_contract.py': initiativeRead,
  'problem_vote_contract.py': problemVoteRead,
  'approval_contract.py': approvalRead,
  'qv_contract.py': qvRead,
  'conviction_contract.py': convictionRead,
  'modification_contract.py': modificationRead,
};

const WRITE: Record<string, Handler> = {
  'community_contract.py': communityWrite,
  'initiative_contract.py': initiativeWrite,
  'problem_vote_contract.py': problemVoteWrite,
  'approval_contract.py': approvalWrite,
  'qv_contract.py': qvWrite,
  'conviction_contract.py': convictionWrite,
  'modification_contract.py': modificationWrite,
};

export function routeRead(contractId: string, method: IMethod, caller: string): unknown {
  const meta = getDemoContract(contractId);
  if (!meta) {
    console.warn(`[DemoRouter] Unknown demo contract ${contractId} for read ${method.name}`);
    return null;
  }
  const handler = READ[meta.contract];
  if (!handler) {
    console.warn(`[DemoRouter] No read handler for ${meta.contract}`);
    return null;
  }
  return handler(contractId, method, caller);
}

export function routeWrite(contractId: string, method: IMethod, caller: string): unknown {
  const meta = getDemoContract(contractId);
  if (!meta) {
    console.warn(`[DemoRouter] Unknown demo contract ${contractId} for write ${method.name}`);
    return null;
  }
  const handler = WRITE[meta.contract];
  if (!handler) {
    console.warn(`[DemoRouter] No write handler for ${meta.contract}`);
    return null;
  }
  return handler(contractId, method, caller);
}
