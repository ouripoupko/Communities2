import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, Plus } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchGaps } from '../../store/slices/initiativeSlice';
import { addGap } from '../../services/contracts/initiative';
import { eventStreamService } from '../../services/eventStream';
import type { BlockchainEvent } from '../../services/eventStream';
import AddGapDialog from './dialogs/AddGapDialog';
import styles from './InitiativeTab.module.scss';

interface GapsProps {
  initiativeId: string;
}

const Gaps: React.FC<GapsProps> = ({ initiativeId }) => {
  const dispatch = useAppDispatch();
  const { initiativeHostServer: encodedHostServer } = useParams<{
    initiativeHostServer?: string;
  }>();
  const { publicKey, serverUrl } = useAppSelector((state) => state.user);
  const { gaps, gapsLoading } = useAppSelector((state) => state.initiative);

  const hostServer =
    encodedHostServer && encodedHostServer !== 'local'
      ? decodeURIComponent(encodedHostServer)
      : serverUrl || '';
  const effectiveServer = hostServer || serverUrl || '';
  const effectiveAgent = publicKey || '';

  const gapList = gaps[initiativeId] ?? [];
  const isLoading = gapsLoading[initiativeId] === true;

  const [showAddDialog, setShowAddDialog] = useState(false);

  const handleContractWrite = useCallback(
    (event: BlockchainEvent) => {
      if (event.contract === initiativeId && effectiveServer && effectiveAgent) {
        dispatch(
          fetchGaps({
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
      fetchGaps({
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

  const handleAddGap = async (title: string, description: string) => {
    if (!effectiveServer || !effectiveAgent) throw new Error('Not connected');
    await addGap(effectiveServer, effectiveAgent, initiativeId, title, description);
    setShowAddDialog(false);
  };

  return (
    <div className={styles.tabContent}>
      <div className={styles.gapsHeader}>
        <div>
          <h3 className={styles.tabTitle}>Gaps</h3>
          <p className={styles.tabSubtitle}>
            Identified gaps that need to be addressed
          </p>
        </div>
        <button
          type="button"
          className={styles.addGapBtn}
          onClick={() => setShowAddDialog(true)}
        >
          <Plus size={18} />
          Add
        </button>
      </div>

      {isLoading ? (
        <div className={styles.emptyState}>
          <p>Loading gaps...</p>
        </div>
      ) : gapList.length === 0 ? (
        <div className={styles.emptyState}>
          <AlertCircle size={48} className={styles.emptyIcon} />
          <p>No gaps yet. Add the first one.</p>
        </div>
      ) : (
        <div className={styles.gapsList}>
          {gapList.map((gap) => (
            <div key={gap.id} className={styles.gapCard}>
              <div className={styles.gapIcon}>
                <AlertCircle size={20} />
              </div>
              <div className={styles.gapContent}>
                <h4 className={styles.gapTitle}>{gap.title}</h4>
                {gap.description && (
                  <p className={styles.gapDescription}>{gap.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddGapDialog
        isVisible={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSubmit={handleAddGap}
      />
    </div>
  );
};

export default Gaps;
