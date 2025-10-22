import currencyContract from "src/assets/contracts/currency_contract.py?raw";
import {
  deployContract,
  joinContract,
  readAgentContract,
  writeAgentContract,
} from "./agent";
import { IInvite, IMethod } from "src/types/interfaces";
import { callbackRegistry } from "src/reducers/serverListener";

export async function deployCurrencyToServer(
  server: string,
  agent: string,
  name: string
) {
  const contract = await deployContract(
    server,
    agent,
    name,
    "currency_contract.py",
    currencyContract,
    null,
    {}
  );
  const method = {
    name: "create_account",
    values: {},
  } as IMethod;
  writeAgentContract(server, agent, contract, method);

  return contract;
}

export async function transfer(
  server: string,
  agent: string,
  contract: string,
  to: string,
  value: number
) {
  const method = {
    name: "transfer",
    values: { to, value },
  } as IMethod;
  return await writeAgentContract(server, agent, contract, method);
}

export async function getAccountsFromServer(
  server: string,
  agent: string,
  contract: string
) {
  const method = {
    name: "get_accounts",
    values: {},
  } as IMethod;
  return await readAgentContract(server, agent, contract, method);
}

export async function getBalanceFromServer(
  server: string,
  agent: string,
  contract: string
) {
  const method = {
    name: "get_balance",
    values: {},
  } as IMethod;
  return await readAgentContract(server, agent, contract, method);
}

export async function setParametersToServer(
  server: string,
  agent: string,
  contract: string,
  mint: number,
  burn: number
) {
  const method = {
    name: "transfer",
    values: { to: agent, value: 0 },
    parameters: { mint, burn },
  } as IMethod;
  return await writeAgentContract(server, agent, contract, method);
}

export async function getParametersFromServer(
  server: string,
  agent: string,
  contract: string
) {
  const method = {
    name: "get_parameters",
    values: {},
  } as IMethod;
  return await readAgentContract(server, agent, contract, method);
}

export async function joinCurrencyContract(
  server: string,
  agent: string,
  invite: IInvite
) {
  if (invite.contract) {
    callbackRegistry.onJoin[invite.contract] = () => {
      if (invite.contract) {
        const method = {
          name: "create_account",
          values: {},
        } as IMethod;
        writeAgentContract(server, agent, invite.contract, method);
        delete callbackRegistry.onJoin[invite.contract];
      }
    };
    joinContract(server, agent, invite);
  }
}