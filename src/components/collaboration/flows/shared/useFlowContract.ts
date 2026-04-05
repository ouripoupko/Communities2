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
  errorMessage: string;
  statusMessage: string;
  retry: () => void;
}

const DEPLOY_TIMEOUT_MS = 30_000;

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
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const isShared = !!parentContractId && !!stageKey;

  const retry = useCallback(() => {
    failed.current = false;
    attempted.current = false;
    setHasError(false);
    setErrorMessage('');
    setStatusMessage('');
  }, []);

  // ── Stale deploying recovery ────────────────────────────────────────────────
  // If Redux says deploying but we haven't attempted in this mount, the flag
  // is stale from a previous session/mount. Clear it so we can retry.
  useEffect(() => {
    if (isDeploying && !attempted.current && !contractId) {
      console.log(`[FlowContract] Clearing stale deploying flag for ${instanceId}`);
      dispatch(clearDeploying({ instanceId }));
    }
  }, [isDeploying, contractId, instanceId, dispatch]);

  // ── Per-user deploy mode ───────────────────────────────────────────────────
  useEffect(() => {
    if (isShared) return;
    if (contractId || isDeploying || attempted.current || failed.current) return;
    if (!serverUrl || !publicKey) return;

    attempted.current = true;
    dispatch(setDeploying({ instanceId }));
    setStatusMessage('Deploying contract to the network...');
    console.log(`[FlowContract] Deploying ${contractName} for ${instanceId}...`);

    // Deploy timeout — force error if promise doesn't settle
    const timeoutId = setTimeout(() => {
      if (!failed.current) {
        console.warn(`[FlowContract] TIMEOUT: Deploy of ${contractName} for ${instanceId} did not complete within ${DEPLOY_TIMEOUT_MS / 1000}s`);
        failed.current = true;
        setHasError(true);
        setErrorMessage('Setup timed out. The server may be slow or offline. Try again later.');
        setStatusMessage('');
        dispatch(clearDeploying({ instanceId }));
      }
    }, DEPLOY_TIMEOUT_MS);

    deployContract({
      serverUrl,
      publicKey,
      name: `${contractName}_${instanceId}`,
      contract: contractFileName,
      code: contractCode,
    })
      .then((response) => {
        clearTimeout(timeoutId);
        if (failed.current) return;
        const id = (response as { id?: string }).id || (response as string);
        setStatusMessage('');
        dispatch(setContract({ instanceId, contractId: id }));
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        if (failed.current) return;
        console.error(`[FlowContract] ERROR deploying ${contractName} for ${instanceId}:`, err);
        failed.current = true;
        setHasError(true);
        setErrorMessage(`Failed to deploy: ${err instanceof Error ? err.message : 'Unknown error'}. Check your server connection.`);
        setStatusMessage('');
        dispatch(clearDeploying({ instanceId }));
      });

    return () => { clearTimeout(timeoutId); };
  }, [isShared, instanceId, contractId, isDeploying, serverUrl, publicKey, contractName, contractFileName, contractCode, dispatch, hasError]);

  // ── Shared contract mode ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isShared) return;
    if (contractId || isDeploying || attempted.current || failed.current) return;
    if (!serverUrl || !publicKey || !parentContractId) return;

    attempted.current = true;
    dispatch(setDeploying({ instanceId }));
    setStatusMessage('Looking up existing contract...');
    console.log(`[FlowContract] Setting up shared ${contractName} for ${instanceId} (parent: ${parentContractId}, stage: ${stageKey})...`);

    // Deploy timeout
    const timeoutId = setTimeout(() => {
      if (!failed.current) {
        console.warn(`[FlowContract] TIMEOUT: Shared setup of ${contractName} for ${instanceId} did not complete within ${DEPLOY_TIMEOUT_MS / 1000}s`);
        failed.current = true;
        setHasError(true);
        setErrorMessage('Setup timed out. The server may be slow or offline. Try again later.');
        setStatusMessage('');
        dispatch(clearDeploying({ instanceId }));
      }
    }, DEPLOY_TIMEOUT_MS);

    (async () => {
      try {
        // Read parent contract details to check for an existing sub-contract
        const details = await contractRead({
          serverUrl,
          publicKey,
          contractId: parentContractId,
          method: { name: 'get_details', values: {} } as IMethod,
        });
        if (failed.current) return; // Timeout already fired

        const stored = details && typeof details === 'object'
          ? (details as Record<string, unknown>)[stageKey!] as
              { contractId: string; address: string; agent: string } | undefined
          : undefined;

        if (stored?.contractId && stored?.address && stored?.agent) {
          setStatusMessage('Joining shared contract...');
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
          if (failed.current) return;
          setStatusMessage('');
          dispatch(setContract({ instanceId, contractId: stored.contractId }));
        } else {
          setStatusMessage('No existing contract found — deploying new one...');
          // No sub-contract yet → deploy and store info on parent
          const response = await deployContract({
            serverUrl,
            publicKey,
            name: `${contractName}_${instanceId}`,
            contract: contractFileName,
            code: contractCode,
          });
          if (failed.current) return;

          const newId = (response as { id?: string }).id || (response as string);
          setStatusMessage('Registering contract with community...');

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
          if (failed.current) return;
          setStatusMessage('');
          dispatch(setContract({ instanceId, contractId: newId }));
        }
        clearTimeout(timeoutId);
      } catch (err) {
        clearTimeout(timeoutId);
        if (failed.current) return;
        console.error(`[FlowContract] ERROR setting up shared contract for ${instanceId}:`, err);
        failed.current = true;
        setHasError(true);
        setErrorMessage(`Failed to set up: ${err instanceof Error ? err.message : 'Unknown error'}. Check your server connection.`);
        setStatusMessage('');
        dispatch(clearDeploying({ instanceId }));
      }
    })();

    return () => { clearTimeout(timeoutId); };
  }, [isShared, instanceId, contractId, isDeploying, serverUrl, publicKey, parentContractId, stageKey, contractName, contractFileName, contractCode, dispatch, hasError]);

  return {
    contractId,
    isReady: contractId !== null,
    isDeploying,
    hasError,
    errorMessage,
    statusMessage,
    retry,
  };
}
