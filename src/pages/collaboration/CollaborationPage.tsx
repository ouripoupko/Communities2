import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { FLOW_REGISTRY, FLOW_GROUPS, getFlow } from '../../components/collaboration/flows/registry';
import cs from '../Container.module.scss';
import styles from './CollaborationPage.module.scss';

export type CollaborationType = 'initiative' | 'wish' | 'agreement';

interface CollaborationTab {
  instanceId: string;
  flowId: string;
}

interface CollaborationPageProps {
  type: CollaborationType;
  title: string;
  subtitle?: string;
  collaborationId: string;
  communityId: string;
}

const CollaborationPage: React.FC<CollaborationPageProps> = ({
  type,
  title,
  subtitle,
  collaborationId,
  communityId,
}) => {
  const navigate = useNavigate();
  const [tabs, setTabs] = useState<CollaborationTab[]>([]);
  const [activeInstanceId, setActiveInstanceId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const addTab = (flowId: string) => {
    const newTab: CollaborationTab = { instanceId: crypto.randomUUID(), flowId };
    setTabs((prev) => [...prev, newTab]);
    setActiveInstanceId(newTab.instanceId);
    setShowAddMenu(false);
  };

  const removeTab = (instanceId: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.instanceId !== instanceId);
      if (activeInstanceId === instanceId) {
        setActiveInstanceId(next.length > 0 ? next[next.length - 1].instanceId : null);
      }
      return next;
    });
  };

  const activeTab = tabs.find((t) => t.instanceId === activeInstanceId);
  const activeFlow = activeTab ? getFlow(activeTab.flowId) : null;
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
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTab(tab.instanceId);
                  }}
                >
                  ×
                </span>
              </button>
            );
          })}

          <div className={styles.addTabWrapper}>
            <button
              className={`${cs.navItem} ${styles.addTabBtn}`}
              onClick={() => setShowAddMenu((v) => !v)}
              title="Add a flow tab"
            >
              <Plus size={20} />
              <span>Add</span>
            </button>
            {showAddMenu && (
              <div className={styles.addTabMenu}>
                {/* Ungrouped flows first (no header) */}
                {FLOW_REGISTRY.filter(f => !f.group).map((flow) => {
                  const available = flow.isAvailable?.(tabs.map(t => t.flowId)) ?? true;
                  return (
                    <button
                      key={flow.id}
                      className={`${styles.addTabMenuItem} ${!available ? styles.addTabMenuItemDisabled : ''}`}
                      onClick={() => { if (available) addTab(flow.id); }}
                      disabled={!available}
                      title={!available ? 'Not available with current tabs' : undefined}
                    >
                      <flow.icon size={16} />
                      {flow.label}
                    </button>
                  );
                })}

                {/* Grouped flows with section headers */}
                {FLOW_GROUPS.map((group, groupIndex) => {
                  const flows = FLOW_REGISTRY.filter(f => f.group === group);
                  if (flows.length === 0) return null;
                  const hasUngrouped = FLOW_REGISTRY.some(f => !f.group);
                  const isFirst = groupIndex === 0 && !hasUngrouped;
                  return (
                    <React.Fragment key={group}>
                      <div className={`${styles.addTabMenuGroupHeader} ${isFirst ? styles.addTabMenuGroupHeaderFirst : ''}`}>
                        {group}
                      </div>
                      {flows.map((flow) => {
                        const available = flow.isAvailable?.(tabs.map(t => t.flowId)) ?? true;
                        return (
                          <button
                            key={flow.id}
                            className={`${styles.addTabMenuItem} ${!available ? styles.addTabMenuItemDisabled : ''}`}
                            onClick={() => { if (available) addTab(flow.id); }}
                            disabled={!available}
                            title={!available ? 'Not available with current tabs' : undefined}
                          >
                            <flow.icon size={16} />
                            {flow.label}
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
          {ActiveComponent && activeTab ? (
            <ActiveComponent
              instanceId={activeTab.instanceId}
              collaborationId={collaborationId}
              collaborationType={type}
            />
          ) : (
            <div className={styles.emptyState}>
              <p>
                No tabs yet. Click <strong>Add</strong> to add your first flow.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CollaborationPage;
