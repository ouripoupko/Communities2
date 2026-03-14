import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronRight, CheckCircle2, Plus, ListTodo } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchSteps } from '../../store/slices/initiativeSlice';
import { addStep } from '../../services/contracts/initiative';
import { eventStreamService } from '../../services/eventStream';
import type { BlockchainEvent } from '../../services/eventStream';
import AddStepDialog from './dialogs/AddStepDialog';
import styles from './InitiativeTab.module.scss';

interface StepsProps {
  initiativeId: string;
}

const Steps: React.FC<StepsProps> = ({ initiativeId }) => {
  const dispatch = useAppDispatch();
  const { initiativeHostServer: encodedHostServer } = useParams<{
    initiativeHostServer?: string;
  }>();
  const { publicKey, serverUrl } = useAppSelector((state) => state.user);
  const { steps, stepsLoading } = useAppSelector((state) => state.initiative);

  const hostServer =
    encodedHostServer && encodedHostServer !== 'local'
      ? decodeURIComponent(encodedHostServer)
      : serverUrl || '';
  const effectiveServer = hostServer || serverUrl || '';
  const effectiveAgent = publicKey || '';

  const stepList = steps[initiativeId] ?? [];
  const isLoading = stepsLoading[initiativeId] === true;

  const [showAddDialog, setShowAddDialog] = useState(false);

  const handleContractWrite = useCallback(
    (event: BlockchainEvent) => {
      if (event.contract === initiativeId && effectiveServer && effectiveAgent) {
        dispatch(
          fetchSteps({
            serverUrl: effectiveServer,
            publicKey: effectiveAgent,
            contractId: initiativeId,
          }),
        );
      }
    },
    [initiativeId, effectiveServer, effectiveAgent, dispatch],
  );

  useEffect(() => {
    if (!initiativeId || !effectiveServer || !effectiveAgent) return;
    dispatch(
      fetchSteps({
        serverUrl: effectiveServer,
        publicKey: effectiveAgent,
        contractId: initiativeId,
      }),
    );
  }, [initiativeId, effectiveServer, effectiveAgent, dispatch]);

  useEffect(() => {
    eventStreamService.addEventListener('contract_write', handleContractWrite);
    return () => eventStreamService.removeEventListener('contract_write', handleContractWrite);
  }, [handleContractWrite]);

  const handleAddStep = async (label: string) => {
    if (!effectiveServer || !effectiveAgent) throw new Error('Not connected');
    await addStep(effectiveServer, effectiveAgent, initiativeId, label);
    setShowAddDialog(false);
  };

  return (
    <div className={styles.tabContent}>
      <div className={styles.stepsHeader}>
        <div>
          <h3 className={styles.tabTitle}>Steps</h3>
          <p className={styles.tabSubtitle}>
            Action items to move the initiative forward
          </p>
        </div>
        <button
          type="button"
          className={styles.addStepBtn}
          onClick={() => setShowAddDialog(true)}
        >
          <Plus size={18} />
          Add
        </button>
      </div>

      {isLoading ? (
        <div className={styles.emptyState}>
          <p>Loading steps...</p>
        </div>
      ) : stepList.length === 0 ? (
        <div className={styles.emptyState}>
          <ListTodo size={48} className={styles.emptyIcon} />
          <p>No steps yet. Add the first action item.</p>
        </div>
      ) : (
        <div className={styles.stepsList}>
          {stepList.map((step) => (
            <div
              key={step.id}
              className={`${styles.stepItem} ${step.completed ? styles.completed : ''}`}
            >
              <div className={styles.stepIcon}>
                {step.completed ? (
                  <CheckCircle2 size={20} />
                ) : (
                  <ChevronRight size={20} />
                )}
              </div>
              <span className={styles.stepLabel}>{step.label}</span>
            </div>
          ))}
        </div>
      )}

      <AddStepDialog
        isVisible={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSubmit={handleAddStep}
      />
    </div>
  );
};

export default Steps;
