// Real API utility for contract and server calls

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(await response.text());
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

// IS_EXIST_AGENT
export async function isExistAgent({
  serverUrl,
  publicKey,
}: {
  serverUrl: string;
  publicKey: string;
}) {
  return await fetchWithTimeout(
    `${serverUrl}/ibc/app/${publicKey}?action=is_exist_agent`,
    { method: 'GET' }
  );
}

// REGISTER_AGENT
export async function registerAgent({
  serverUrl,
  publicKey,
}: {
  serverUrl: string;
  publicKey: string;
}) {
  return await fetchWithTimeout(
    `${serverUrl}/ibc/app/${publicKey}?action=register_agent`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: serverUrl }),
    }
  );
}

// GET_CONTRACTS
export async function getContracts({
  serverUrl,
  publicKey,
}: {
  serverUrl: string;
  publicKey: string;
}) {
  return await fetchWithTimeout(
    `${serverUrl}/ibc/app/${publicKey}?action=get_contracts`,
    { method: 'GET' }
  );
}

// DEPLOY_CONTRACT
export async function deployContract({
  serverUrl,
  publicKey,
  name,
  contract,
  code,
}: {
  serverUrl: string;
  publicKey: string;
  name: string;
  contract: string;
  code: string;
}) {
  // Construct IContract object with defaults
  const IContract = {
    id: '',
    name,
    contract,
    code,
    protocol: 'BFT',
    default_app: '',
    pid: publicKey,
    address: serverUrl,
    group: [],
    threshold: 0,
    profile: null,
    constructor: {},
  };
  return await fetchWithTimeout(
    `${serverUrl}/ibc/app/${publicKey}?action=deploy_contract`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(IContract),
    }
  );
}

// JOIN_CONTRACT
export async function joinContract({
  serverUrl,
  publicKey,
  address,
  agent,
  contract,
  profile = '',
}: {
  serverUrl: string;
  publicKey: string;
  address: string;
  agent: string;
  contract: string;
  profile?: string;
}) {
  return await fetchWithTimeout(
    `${serverUrl}/ibc/app/${publicKey}?action=join_contract`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, agent, contract, profile }),
    }
  );
}

// CONTRACT WRITE
export async function contractWrite({
  serverUrl,
  publicKey,
  contractId,
  method,
  args = {},
}: {
  serverUrl: string;
  publicKey: string;
  contractId: string;
  method: string;
  args?: Record<string, unknown>;
}) {
  // Construct IMethod object
  const IMethod = {
    name: method,
    arguments: Object.keys(args),
    values: args,
  };
  return await fetchWithTimeout(
    `${serverUrl}/ibc/app/${publicKey}/${contractId}/${method}?action=contract_write`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(IMethod),
    }
  );
}

// CONTRACT READ
export async function contractRead({
  serverUrl,
  publicKey,
  contractId,
  method,
  args = {},
}: {
  serverUrl: string;
  publicKey: string;
  contractId: string;
  method: string;
  args?: Record<string, unknown>;
}) {
  // Construct IMethod object
  const IMethod = {
    name: method,
    arguments: Object.keys(args),
    values: args,
  };
  return await fetchWithTimeout(
    `${serverUrl}/ibc/app/${publicKey}/${contractId}/${method}?action=contract_read`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(IMethod),
    }
  );
}
