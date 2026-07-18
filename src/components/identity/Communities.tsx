import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchContracts } from '../../store/slices/userSlice';
import { useEventStream } from '../../hooks/useEventStream';
import CreateCommunityDialog from './communities/CreateCommunityDialog';
import styles from './Communities.module.scss';

const Communities: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user);
  const { contracts, loading } = useAppSelector((state) => state.user);
  const [showCreateForm, setShowCreateForm] = useState(false);


  // Filter contracts for community contracts
  const communityContracts = contracts.filter(
    (contract) => contract.contract === 'community_contract.py'
  );

  // Memoize the event handler to prevent unnecessary re-registrations
  const handleDeployContract = useCallback(() => {
    if (user.publicKey && user.serverUrl) {
      dispatch(fetchContracts());
    }
  }, [user.publicKey, user.serverUrl, dispatch]);

  // Listen for contract deployment events
  useEventStream('deploy_contract', handleDeployContract);

  // Memoize the close handler to prevent dialog re-renders
  const handleCloseDialog = useCallback(() => {
    setShowCreateForm(false);
  }, []);

  // Note: Community details will be fetched when navigating to specific community pages

  const handleCommunityClick = (contractId: string) => {
    navigate(`/community/${contractId}`);
  };



  // The dialog is always rendered in this exact same tree position - as the
  // first child of this Fragment - regardless of `loading`. It must NEVER
  // sit inside a subtree whose root element type changes between renders
  // (e.g. a div in one branch, nothing in another): React unmounts and
  // remounts a whole subtree when its root type changes, which would wipe
  // the dialog's in-progress submission state (isSubmitting,
  // pendingContractId) any time `loading` toggles - which it does mid-
  // creation, since the deploy_contract SSE event fires while the dialog
  // is still open and waiting.
  return (
    <>
      <CreateCommunityDialog
        isVisible={showCreateForm}
        onClose={handleCloseDialog}
      />

      {loading ? (
        <div className={styles.container}>
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p className={styles.text}>Loading communities...</p>
          </div>
        </div>
      ) : (
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.titleSection}>
              <h1 className={styles.title}>Communities</h1>
              <p className={styles.subtitle}>Manage your communities and collaborations</p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className={styles.createButton}
            >
              <Plus size={20} />
              Create Community
            </button>
          </div>

          <div className={styles.grid}>
            {communityContracts.map((contract) => (
              <div
                key={contract.id}
                className={styles.card}
                onClick={() => handleCommunityClick(contract.id)}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.icon}>
                    <Users size={24} />
                  </div>
                  <div className={styles.info}>
                    <h3 className={styles.name}>{contract.name || 'Community'}</h3>
                    <p className={styles.description}>Community details will load when you enter</p>
                  </div>
                </div>
                <div className={styles.stats}>
                  <div className={styles.stat}>
                    <span className={styles.label}>Contract ID:</span>
                    <span className={styles.value}>{contract.id.slice(0, 8)}...</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.label}>Type:</span>
                    <span className={styles.value}>Community</span>
                  </div>
                </div>
                <div className={styles.actions}>
                  <button className={styles.viewButton}>
                    <span>View Community</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {communityContracts.length === 0 && (
            <div className={styles.emptyState}>
              <Users size={48} className={styles.icon} />
              <h3 className={styles.title}>No Communities Yet</h3>
              <p className={styles.description}>Create your first community to start collaborating</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className={styles.createButton}
              >
                <Plus size={20} />
                Create Community
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default Communities; 