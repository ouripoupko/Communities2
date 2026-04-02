import { useEffect, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '../../../../store/hooks';
import { setContract, setDeploying, clearDeploying } from './flowContractsSlice';
import { deployContract } from '../../../../services/api';

interface UseFlowContractResult {
  contractId: string | null;
  isReady: boolean;
  isDeploying: boolean;
}

/**
 * Manages contract lifecycle for a flow instance.
 * Deploys a new contract on first use; returns cached contractId on subsequent uses.
 */
export function useFlowContract(
  instanceId: string,
  contractName: string,
  contractFileName: string,
  contractCode: string,
): UseFlowContractResult {
  const dispatch = useAppDispatch();
  const contractId = useAppSelector((s) => s.flowContracts.contracts[instanceId] ?? null);
  const isDeploying = useAppSelector((s) => s.flowContracts.deploying[instanceId] ?? false);
  const serverUrl = useAppSelector((s) => s.user.serverUrl);
  const publicKey = useAppSelector((s) => s.user.publicKey);
  const deployAttempted = useRef(false);

  useEffect(() => {
    if (contractId || isDeploying || deployAttempted.current) return;
    if (!serverUrl || !publicKey) return;

    deployAttempted.current = true;
    dispatch(setDeploying({ instanceId }));

    deployContract({
      serverUrl,
      publicKey,
      name: `${contractName}_${instanceId}`,
      contract: contractFileName,
      code: contractCode,
    })
      .then((response) => {
        const id = (response as { id?: string }).id || (response as string);
        dispatch(setContract({ instanceId, contractId: id }));
      })
      .catch((err) => {
        console.error(`Failed to deploy contract for ${instanceId}:`, err);
        dispatch(clearDeploying({ instanceId }));
        deployAttempted.current = false;
      });
  }, [instanceId, contractId, isDeploying, serverUrl, publicKey, contractName, contractFileName, contractCode, dispatch]);

  return {
    contractId,
    isReady: contractId !== null,
    isDeploying,
  };
}
