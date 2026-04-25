import { contractRead, contractWrite } from '../../../../services/api';
import type { IMethod } from '../../../../services/interfaces';

function throwIfContractError(response: unknown) {
  if (
    response &&
    typeof response === 'object' &&
    'error' in response &&
    typeof (response as { error?: unknown }).error === 'string'
  ) {
    throw new Error((response as { error: string }).error);
  }
  return response;
}

export async function stake(
  serverUrl: string, publicKey: string, contractId: string,
  amount: number, duration: string, country: string,
) {
  return throwIfContractError(await contractWrite({
    serverUrl, publicKey, contractId,
    method: { name: 'stake', values: { amount, duration, country } } as IMethod,
  }));
}

export async function getMyStake(serverUrl: string, publicKey: string, contractId: string) {
  return await contractRead({
    serverUrl, publicKey, contractId,
    method: { name: 'get_my_stake', values: {} } as IMethod,
  });
}

export async function getStakes(serverUrl: string, publicKey: string, contractId: string) {
  return await contractRead({
    serverUrl, publicKey, contractId,
    method: { name: 'get_stakes', values: {} } as IMethod,
  });
}

export async function getTotalConviction(serverUrl: string, publicKey: string, contractId: string) {
  return await contractRead({
    serverUrl, publicKey, contractId,
    method: { name: 'get_total_conviction', values: {} } as IMethod,
  });
}

export async function getConvictionByCountry(serverUrl: string, publicKey: string, contractId: string) {
  return await contractRead({
    serverUrl, publicKey, contractId,
    method: { name: 'get_conviction_by_country', values: {} } as IMethod,
  });
}
