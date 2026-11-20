import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppSelector } from '../../store/hooks';
import { accountLabel } from '../../hooks/useCurrency';
import type { AccountKind } from '../../services/contracts/community';
import styles from './AccountPicker.module.scss';

export interface AccountOption {
  id: string;
  label: string;
  kind: AccountKind;
}

interface AccountPickerProps {
  communityId: string;
  value: string;
  onChange: (accountId: string) => void;
  excludeAccountIds?: string[];
  kinds?: AccountKind[];
  placeholder?: string;
  disabled?: boolean;
}

// Shown inside pages that load the community's currency (useCurrency): it
// reads the accounts from the store.
const AccountPicker: React.FC<AccountPickerProps> = ({
  communityId,
  value,
  onChange,
  excludeAccountIds = [],
  kinds = ['personal', 'fund'],
  placeholder = 'Search for an account...',
  disabled,
}) => {
  const { communityAccounts } = useAppSelector((state) => state.currency);
  const { profiles } = useAppSelector((state) => state.communities);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const options = useMemo<AccountOption[]>(
    () => (communityAccounts[communityId] ?? [])
      .filter((account) => kinds.includes(account.kind) && !excludeAccountIds.includes(account.id))
      .map((account) => ({ id: account.id, label: accountLabel(account, profiles), kind: account.kind })),
    [communityAccounts, communityId, profiles, excludeAccountIds, kinds],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) => opt.label.toLowerCase().includes(q) || opt.id.toLowerCase().includes(q),
    );
  }, [options, query]);

  const selected = options.find((opt) => opt.id === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={styles.container} ref={containerRef}>
      <input
        type="text"
        className={`input-field ${styles.input}`}
        value={isOpen ? query : selected ? selected.label : ''}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          setQuery('');
          setIsOpen(true);
        }}
        placeholder={placeholder}
        disabled={disabled}
      />
      {isOpen && (
        <div className={styles.dropdown}>
          {filtered.length === 0 ? (
            <div className={styles.empty}>No matching accounts</div>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={styles.option}
                onClick={() => {
                  onChange(opt.id);
                  setQuery('');
                  setIsOpen(false);
                }}
              >
                <span className={styles.optionLabel}>{opt.label}</span>
                <span className={styles.optionKind}>
                  {opt.kind === 'personal' ? 'Member' : 'Fund account'}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AccountPicker;
