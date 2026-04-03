import { contractRead, contractWrite, deployContract } from '../api';
import type { IMethod } from '../interfaces';

import rankingFlowCode         from '../../assets/contracts/ranking_flow_contract.py?raw';
import scoringFlowCode         from '../../assets/contracts/scoring_flow_contract.py?raw';
import documentFlowCode        from '../../assets/contracts/document_flow_contract.py?raw';
import fundraisingFlowCode     from '../../assets/contracts/fundraising_flow_contract.py?raw';
import discussionFlowCode      from '../../assets/contracts/discussion_flow_contract.py?raw';
import schedulingFlowCode      from '../../assets/contracts/scheduling_flow_contract.py?raw';
import budgetAllocationFlowCode from '../../assets/contracts/budget_allocation_flow_contract.py?raw';
import taskBoardFlowCode       from '../../assets/contracts/task_board_flow_contract.py?raw';
import concernsFlowCode        from '../../assets/contracts/concerns_flow_contract.py?raw';
import qaFlowCode              from '../../assets/contracts/qa_flow_contract.py?raw';
import rolesFlowCode           from '../../assets/contracts/roles_flow_contract.py?raw';

/**
 * A flow reference stored in a collaboration contract.
 * Points to the flow contract on the creating participant's server.
 * The app constructs and deconstructs this dict; the contract stores it opaquely.
 */
export interface FlowRef {
  /** Contract id of the flow on the owner's server */
  id: string;
  /** Server URL where the flow contract is deployed */
  server: string;
  /** Public key of the agent who owns the flow contract */
  agent: string;
  /** Flow type id matching the registry (e.g. 'ranking', 'discussion') */
  type: string;
}

// ---------------------------------------------------------------------------
// Flow contract specs — one entry per registry flow type
// ---------------------------------------------------------------------------
interface FlowContractSpec {
  /** Python class name */
  contract: string;
  /** Python source code (imported as raw string) */
  code: string;
}

const FLOW_SPECS: Record<string, FlowContractSpec> = {
  'ranking':          { contract: 'RankingFlow',          code: rankingFlowCode },
  'scoring':          { contract: 'ScoringFlow',          code: scoringFlowCode },
  'document':         { contract: 'DocumentFlow',         code: documentFlowCode },
  'fundraising':      { contract: 'FundraisingFlow',      code: fundraisingFlowCode },
  'discussion':       { contract: 'DiscussionFlow',       code: discussionFlowCode },
  'scheduling':       { contract: 'SchedulingFlow',       code: schedulingFlowCode },
  'budget-allocation':{ contract: 'BudgetAllocationFlow', code: budgetAllocationFlowCode },
  'task-board':       { contract: 'TaskBoardFlow',        code: taskBoardFlowCode },
  'concerns':         { contract: 'ConcernsFlow',         code: concernsFlowCode },
  'qa':               { contract: 'QAFlow',               code: qaFlowCode },
  'roles':            { contract: 'RolesFlow',            code: rolesFlowCode },
};

// ---------------------------------------------------------------------------
// Deploy a new flow contract on the current user's server.
// Returns the new contract id.
// ---------------------------------------------------------------------------
export async function deployFlowContract(
  serverUrl: string,
  publicKey: string,
  flowType: string,
): Promise<string> {
  const spec = FLOW_SPECS[flowType];
  if (!spec) throw new Error(`Unknown flow type: ${flowType}`);

  const result = await deployContract({
    serverUrl,
    publicKey,
    name: spec.contract,
    contract: spec.contract,
    code: spec.code,
  });
  const id = (result as { id?: string }).id ?? (result as string);
  if (!id) throw new Error(`deployContract did not return an id for flow type: ${flowType}`);
  return id;
}

// ---------------------------------------------------------------------------
// Store a flow reference in a collaboration contract.
// The collaboration contract may live on a different server than the user's.
// ---------------------------------------------------------------------------
export async function addFlow(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  flow: FlowRef,
): Promise<void> {
  await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'add_flow', values: { flow } } as IMethod,
  });
}

// ---------------------------------------------------------------------------
// Retrieve all flow references from a collaboration contract.
// ---------------------------------------------------------------------------
export async function getFlows(
  serverUrl: string,
  publicKey: string,
  contractId: string,
): Promise<FlowRef[]> {
  const result = await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'get_flows', values: {} } as IMethod,
  });
  const arr = Array.isArray(result) ? result : [];
  return arr.map((f: Record<string, unknown>) => ({
    id:     String(f.id     ?? ''),
    server: String(f.server ?? ''),
    agent:  String(f.agent  ?? ''),
    type:   String(f.type   ?? ''),
  }));
}
