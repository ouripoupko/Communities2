import { contractRead, contractWrite, deployContract } from '../api';
import type { IMethod } from '../interfaces';
import communityContractCode from '../../assets/contracts/community_contract.py?raw';
import issueContractCode from '../../assets/contracts/issue_contract.py?raw';

/**
 * Community contract interface
 * Handles all community-specific contract calls
 */

export interface IParameters {
  medians: {
    mint: number;
    burn: number;
  };
  parameters: {
    mint: number;
    burn: number;
  };
}

export async function createCommunity(
  serverUrl: string,
  publicKey: string,
  communityName: string,
  communityDescription: string,
  profile: string | null
  
) {
  // Deploy the community contract
  const contractId = await deployContract({
    serverUrl,
    publicKey,
    name: communityName,
    contract: 'community_contract.py',
    code: communityContractCode,
    profile: profile || undefined,
  });
  
  // Set properties: name, description, createdAt
  if (contractId) {
    await contractWrite({
      serverUrl,
      publicKey,
      contractId,
      method: {
        name: 'set_property',
        values: {
          key: 'name',
          value: communityName
        },
      } as IMethod
    });
    
    await contractWrite({
      serverUrl,
      publicKey,
      contractId,
      method: {
        name: 'set_property',
        values: {
          key: 'description',
          value: communityDescription
        },
      } as IMethod,
    });
    
    await contractWrite({
      serverUrl,
      publicKey,
      contractId,
      method: {
        name: 'set_property',
        values: {
          key: 'createdAt',
          value: new Date().toISOString()
        },
      } as IMethod,
    });

    // Call request_join to join the community as the creator
    await contractWrite({
      serverUrl,
      publicKey,
      contractId,
      method: {
        name: 'request_join',
        values: {},
      } as IMethod,
    });
  }
}

/**
 * Get partners from the community contract
 */
export async function getPartners(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'get_partners',
      values: {},
    } as IMethod,
  });
}

/**
 * Get all people from the community contract (tasks, members, nominates)
 */
export async function getAllPeople(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'get_all_people',
      values: {},
    } as IMethod,
  });
}

/**
 * Get community properties
 */
export async function getProperties(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'get_properties',
      values: {},
    } as IMethod,
  });
}

export async function createIssue(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  issue: { title: string; description: string },
) {
  // 1. Deploy the issue contract with the issue title as the name
  const fileName = 'issue_contract.py';
  const response = await deployContract({
    serverUrl,
    publicKey,
    name: issue.title,
    contract: fileName,
    code: issueContractCode,
  });
  const issueId = response.id || response;
  
  // 2. Set the issue properties (name and description)
  await contractWrite({
    serverUrl,
    publicKey,
    contractId: issueId,
    method: {
      name: 'set_name',
      values: { name: issue.title },
    } as IMethod,
  });
  
  await contractWrite({
    serverUrl,
    publicKey,
    contractId: issueId,
    method: {
      name: 'set_description',
      values: { text: issue.description },
    } as IMethod,
  });
  
  // 3. Add the issue to the community contract
  await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'add_issue',
      values: {
        issue: {
          server: serverUrl,
          agent: publicKey,
          contract: issueId,
        },
      },
    } as IMethod,
  });
}

/**
 * Get community issues
 */
export async function getIssues(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'get_issues',
      values: {},
    } as IMethod,
  });
}

export async function requestJoin(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  // Call request_join on the community contract
  await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'request_join',
      values: {},
    } as IMethod,
  });
}

/**
 * Approve an agent for community membership
 */
export async function approveAgent(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  agentPublicKey: string,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId: contractId,
    method: {
      name: 'approve',
      values: { approved: agentPublicKey },
    } as IMethod,
  });
}

/**
 * Disapprove an agent for community membership
 */
export async function disapproveAgent(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  agentPublicKey: string,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'disapprove',
      values: { disapproved: agentPublicKey },
    } as IMethod,
  });
}

export async function transfer(
  server: string,
  agent: string,
  contract: string,
  to: string,
  value: number
) {
  return await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId: contract,
    method: {
      name: 'transfer',
      values: { to, value },
    } as IMethod,
  });
}

export async function getBalance(
  serverUrl: string,
  publicKey: string,
  contractId: string
) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'get_balance',
      values: {},
    } as IMethod,
  });
}

export async function setParameters(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  mint: number,
  burn: number
) {
  return await contractWrite({
    serverUrl: serverUrl,
    publicKey: publicKey,
    contractId: contractId,
    method: {
      name: 'transfer',
      values: { to: publicKey, value: 0 },
      parameters: { mint, burn },
    } as IMethod,
  });
}

export async function getParameters(
  serverUrl: string,
  publicKey: string,
  contractId: string
) {
  const parameters: IParameters = await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: "get_parameters",
      values: {},
    } as IMethod,
  });
  
  if (!parameters.parameters || Object.keys(parameters.parameters).length === 0) {
    console.log('No parameters found, setting default values');
    setParameters(serverUrl, publicKey, contractId, 100, 0.0003);
  }

  return parameters;
}
