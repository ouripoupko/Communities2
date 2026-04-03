import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { FLOW_REGISTRY, FLOW_GROUPS, getFlow } from '../../components/collaboration/flows/registry';
import { deployFlowContract, addFlow, getFlows } from '../../services/contracts/flows';
import { useAppSelector } from '../../store/hooks';
import cs from '../Container.module.scss';
import styles from './CollaborationPage.module.scss';

export type CollaborationType = 'initiative' | 'wish' | 'agreement';

interface CollaborationTab {
  instanceId: string;
  flowId: string;
  /** Server where the flow contract lives */
  flowServer: string;
  /** Agent (public key) who owns the flow contract */
  flowAgent: string;
}

interface CollaborationPageProps {
  type: CollaborationType;
  title: string;
  subtitle?: string;
  collaborationId: string;
  communityId: string;
  collaborationServer?: string;
  collaborationAgent?: string;
}

const CollaborationPage: React.FC<CollaborationPageProps> = ({
  type,
  title,
  subtitle,
  collaborationId,
  communityId,
  collaborationServer,
  collaborationAgent,
}) => {
  const navigate = useNavigate();
  const { publicKey, serverUrl } = useAppSelector((state) => state.user);

  const [tabs,             setTabs]             = useState<CollaborationTab[]>([]);
  const [activeInstanceId, setActiveInstanceId] = useState<string | null>(null);
  const [showAddMenu,      setShowAddMenu]       = useState(false);
  const [isAddingTab,      setIsAddingTab]       = useState(false);
  const [isLoadingTabs,    setIsLoadingTabs]     = useState(false);

  const collabServer = collaborationServer ?? serverUrl;
  const collabAgent  = collaborationAgent  ?? publicKey;

  // Restore tabs from collaboration contract on mount
  useEffect(() => {
    if (!collabServer || !collabAgent || !collaborationId) return;

    setIsLoadingTabs(true);
    getFlows(collabServer, collabAgent, collaborationId)
      .then((flows) => {
        const restored = flows
          .filter((f) => f.id && f.type)
          .map((f) => ({
            instanceId: f.id,
            flowId:     f.type,
            flowServer: f.server,
            flowAgent:  f.agent,
          }));
        setTabs(restored);
        if (restored.length > 0) setActiveInstanceId(restored[0].instanceId);
      })
      .catch((err) => console.error('Failed to load collaboration flows:', err))
      .finally(() => setIsLoadingTabs(false));
  }, [collabServer, collabAgent, collaborationId]);

  // Deploy flow contract on user's server and register reference in collaboration contract
  const addTab = useCallback(async (flowId: string) => {
    if (!serverUrl || !publicKey || !collabServer || !collabAgent) return;

    setShowAddMenu(false);
    setIsAddingTab(true);
    try {
      const contractId = await deployFlowContract(serverUrl, publicKey, flowId);
      const flow = { id: contractId, server: serverUrl, agent: publicKey, type: flowId };
      await addFlow(collabServer, collabAgent, collaborationId, flow);
      const newTab: CollaborationTab = {
        instanceId: contractId,
        flowId,
        flowServer: serverUrl,
        flowAgent:  publicKey,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveInstanceId(contractId);
    } catch (err) {
      console.error('Failed to add flow tab:', err);
    } finally {
      setIsAddingTab(false);
    }
  }, [serverUrl, publicKey, collabServer, collabAgent, collaborationId]);

  const removeTab = (instanceId: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.instanceId !== instanceId);
      if (activeInstanceId === instanceId)
        setActiveInstanceId(next.length > 0 ? next[next.length - 1].instanceId : null);
      return next;
    });
  };

  const activeTab   = tabs.find((t) => t.instanceId === activeInstanceId);
  const activeFlow  = activeTab ? getFlow(activeTab.flowId) : null;
  const ActiveComponent = activeFlow?.component ?? null;

  return (
    <div className={cs.container}>
      <PageHeader
        showBackButton={true}
        backButtonText="Back to Community"
        onBackClick={() => navigate(`/community/${communityId}/collaborations`)}
        title={title}
        subtitle={subtitle}
        layout="two-row"
      />

      <div className={cs.content}>
        <nav className={cs.nav}>
          {tabs.map((tab) => {
            const flow = getFlow(tab.flowId);
            if (!flow) return null;
            const isActive = tab.instanceId === activeInstanceId;
            return (
              <button
                key={tab.instanceId}
                className={`${cs.navItem} ${isActive ? cs.active : ''} ${styles.tabItem}`}
                onClick={() => setActiveInstanceId(tab.instanceId)}
              >
                <flow.icon size={20} />
                <span>{flow.label}</span>
                <span
                  className={styles.removeBtn}
                  role="button"
                  aria-label={`Remove ${flow.label} tab`}
                  onClick={(e) => { e.stopPropagation(); removeTab(tab.instanceId); }}
                >
                  ×
                </span>
              </button>
            );
          })}

          <div className={styles.addTabWrapper}>
            <button
              className={`${cs.navItem} ${styles.addTabBtn} ${isAddingTab ? styles.addTabBtnLoading : ''}`}
              onClick={() => !isAddingTab && setShowAddMenu((v) => !v)}
              title="Add a flow tab"
              disabled={isAddingTab}
            >
              {isAddingTab ? <Loader size={20} className={styles.spinner} /> : <Plus size={20} />}
              <span>{isAddingTab ? 'Adding…' : 'Add'}</span>
            </button>

            {showAddMenu && (
              <div className={styles.addTabMenu}>
                {FLOW_REGISTRY.filter((f) => !f.group).map((flow) => {
                  const available = flow.isAvailable?.(tabs.map((t) => t.flowId)) ?? true;
                  return (
                    <button
                      key={flow.id}
                      className={`${styles.addTabMenuItem} ${!available ? styles.addTabMenuItemDisabled : ''}`}
                      onClick={() => { if (available) void addTab(flow.id); }}
                      disabled={!available}
                      title={!available ? 'Not available with current tabs' : undefined}
                    >
                      <flow.icon size={16} /> {flow.label}
                    </button>
                  );
                })}

                {FLOW_GROUPS.map((group, groupIndex) => {
                  const flows = FLOW_REGISTRY.filter((f) => f.group === group);
                  if (flows.length === 0) return null;
                  const hasUngrouped = FLOW_REGISTRY.some((f) => !f.group);
                  const isFirst = groupIndex === 0 && !hasUngrouped;
                  return (
                    <React.Fragment key={group}>
                      <div className={`${styles.addTabMenuGroupHeader} ${isFirst ? styles.addTabMenuGroupHeaderFirst : ''}`}>
                        {group}
                      </div>
                      {flows.map((flow) => {
                        const available = flow.isAvailable?.(tabs.map((t) => t.flowId)) ?? true;
                        return (
                          <button
                            key={flow.id}
                            className={`${styles.addTabMenuItem} ${!available ? styles.addTabMenuItemDisabled : ''}`}
                            onClick={() => { if (available) void addTab(flow.id); }}
                            disabled={!available}
                            title={!available ? 'Not available with current tabs' : undefined}
                          >
                            <flow.icon size={16} /> {flow.label}
                          </button>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        <div className={cs.main}>
          {isLoadingTabs ? (
            <div className={styles.emptyState}>
              <Loader size={24} className={styles.spinner} />
              <p>Loading tabs…</p>
            </div>
          ) : ActiveComponent && activeTab ? (
            <ActiveComponent
              instanceId={activeTab.instanceId}
              flowServer={activeTab.flowServer}
              flowAgent={activeTab.flowAgent}
              currentUser={publicKey ?? ''}
              collaborationId={collaborationId}
              collaborationType={type}
            />
          ) : (
            <div className={styles.emptyState}>
              <p>No tabs yet. Click <strong>Add</strong> to add your first flow.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CollaborationPage;
