import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../../../../store/hooks';
import { setContract, setDeploying, clearDeploying } from './flowContractsSlice';
import { deployContract, joinContract, contractRead, contractWrite } from '../../../../services/api';
import type { IMethod } from '../../../../services/interfaces';

interface UseFlowContractResult {
  contractId: string | null;
  isReady: boolean;
  isDeploying: boolean;
  hasError: boolean;
  retry: () => void;
}

/**
 * Manages contract lifecycle for a flow instance.
 *
 * Per-user mode (no parentContractId/stageKey):
 *   Deploys a new contract on first use; returns cached contractId on subsequent uses.
 *
 * Shared mode (parentContractId + stageKey provided):
 *   Reads the parent contract's details for a stored sub-contract under stageKey.
 *   If found → joins the existing contract via joinContract().
 *   If not found → deploys a new contract and stores its info on the parent so others can join.
 *   All community members end up reading/writing the same contract instance.
 */
export function useFlowContract(
  instanceId: string,
  contractName: string,
  contractFileName: string,
  contractCode: string,
  parentContractId?: string,
  stageKey?: string,
): UseFlowContractResult {
  const dispatch = useAppDispatch();
  const contractId = useAppSelector((s) => s.flowContracts.contracts[instanceId] ?? null);
  const isDeploying = useAppSelector((s) => s.flowContracts.deploying[instanceId] ?? false);
  const serverUrl = useAppSelector((s) => s.user.serverUrl);
  const publicKey = useAppSelector((s) => s.user.publicKey);
  const attempted = useRef(false);
  const failed = useRef(false);
  const [hasError, setHasError] = useState(false);

  const isShared = !!parentContractId && !!stageKey;

  const retry = useCallback(() => {
    failed.current = false;
    attempted.current = false;
    setHasError(false);
  }, []);

  // ── Per-user deploy mode ───────────────────────────────────────────────────
  useEffect(() => {
    if (isShared) return;
    if (contractId || isDeploying || attempted.current || failed.current) return;
    if (!serverUrl || !publicKey) return;

    let cancelled = false;
    attempted.current = true;
    dispatch(setDeploying({ instanceId }));

    deployContract({
      serverUrl,
      publicKey,
      name: `${contractName}_${instanceId}`,
      contract: contractFileName,
      code: contractCode,
    })
      .then((response) => {
        if (cancelled) return;
        const id = (response as { id?: string }).id || (response as string);
        dispatch(setContract({ instanceId, contractId: id }));
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(`Failed to deploy contract for ${instanceId}:`, err);
        failed.current = true;
        setHasError(true);
        dispatch(clearDeploying({ instanceId }));
      });

    return () => { cancelled = true; };
  }, [isShared, instanceId, contractId, isDeploying, serverUrl, publicKey, contractName, contractFileName, contractCode, dispatch, hasError]);

  // ── Shared contract mode ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isShared) return;
    if (contractId || isDeploying || attempted.current || failed.current) return;
    if (!serverUrl || !publicKey || !parentContractId) return;

    let cancelled = false;
    attempted.current = true;
    dispatch(setDeploying({ instanceId }));

    (async () => {
      try {
        // Read parent contract details to check for an existing sub-contract
        const details = await contractRead({
          serverUrl,
          publicKey,
          contractId: parentContractId,
          method: { name: 'get_details', values: {} } as IMethod,
        });
        if (cancelled) return;

        const stored = details && typeof details === 'object'
          ? (details as Record<string, unknown>)[stageKey!] as
              { contractId: string; address: string; agent: string } | undefined
          : undefined;

        if (stored?.contractId && stored?.address && stored?.agent) {
          // Sub-contract exists → join it
          try {
            await joinContract({
              serverUrl,
              publicKey,
              address: stored.address,
              agent: stored.agent,
              contract: stored.contractId,
            });
          } catch {
            // May fail if already joined — that's OK
          }
          if (cancelled) return;
          dispatch(setContract({ instanceId, contractId: stored.contractId }));
        } else {
          // No sub-contract yet → deploy and store info on parent
          const response = await deployContract({
            serverUrl,
            publicKey,
            name: `${contractName}_${instanceId}`,
            contract: contractFileName,
            code: contractCode,
          });
          if (cancelled) return;

          const newId = (response as { id?: string }).id || (response as string);

          // Write the sub-contract info to the parent so other users can join
          const currentDetails = details && typeof details === 'object'
            ? details as Record<string, unknown>
            : {};
          await contractWrite({
            serverUrl,
            publicKey,
            contractId: parentContractId,
            method: {
              name: 'set_details',
              values: {
                details: {
                  ...currentDetails,
                  [stageKey!]: { contractId: newId, address: serverUrl, agent: publicKey },
                },
              },
            } as IMethod,
          });
          if (cancelled) return;
          dispatch(setContract({ instanceId, contractId: newId }));
        }
      } catch (err) {
        if (cancelled) return;
        console.error(`Failed to setup shared contract for ${instanceId}:`, err);
        failed.current = true;
        setHasError(true);
        dispatch(clearDeploying({ instanceId }));
      }
    })();

    return () => { cancelled = true; };
  }, [isShared, instanceId, contractId, isDeploying, serverUrl, publicKey, parentContractId, stageKey, contractName, contractFileName, contractCode, dispatch, hasError]);

  return {
    contractId,
    isReady: contractId !== null,
    isDeploying,
    hasError,
    retry,
  };
}
