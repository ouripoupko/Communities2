import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppSelector } from '../../store/hooks';
import { getAccountDetails } from '../../services/contracts/community';
import { getMemberDisplayName } from '../../utils/memberDisplay';
import styles from './AccountPicker.module.scss';

export interface AccountOption {
  id: string;
  label: string;
  kind: 'personal' | 'public' | 'fund';
}

interface AccountPickerProps {
  communityId: string;
  value: string;
  onChange: (accountId: string) => void;
  excludeAccountIds?: string[];
  kinds?: Array<'personal' | 'public' | 'fund'>;
  placeholder?: string;
  disabled?: boolean;
}

const AccountPicker: React.FC<AccountPickerProps> = ({
  communityId,
  value,
  onChange,
  excludeAccountIds = [],
  kinds = ['personal', 'public', 'fund'],
  placeholder = 'Search for an account...',
  disabled,
}) => {
  const { publicKey, serverUrl } = useAppSelector((state) => state.user);
  const { communityMembers, profiles } = useAppSelector((state) => state.communities);
  const [nonPersonalAccounts, setNonPersonalAccounts] = useState<AccountOption[]>([]);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!publicKey || !serverUrl || !communityId) return;
    let cancelled = false;
    void getAccountDetails(serverUrl, publicKey, communityId).then((details) => {
      if (cancelled) return;
      const options: AccountOption[] = Object.entries(details)
        .filter(([, info]) => info.type === 'public' || info.type === 'fund')
        .map(([id, info]) => ({ id, label: info.name || id, kind: info.type as 'public' | 'fund' }));
      setNonPersonalAccounts(options);
    });
    return () => {
      cancelled = true;
    };
  }, [serverUrl, publicKey, communityId]);

  const options = useMemo<AccountOption[]>(() => {
    const members = Array.isArray(communityMembers[communityId]) ? communityMembers[communityId] : [];
    const personal: AccountOption[] = members.map((pubkey) => ({
      id: pubkey,
      label: getMemberDisplayName(profiles[pubkey]),
      kind: 'personal' as const,
    }));
    return [...personal, ...nonPersonalAccounts]
      .filter((opt) => kinds.includes(opt.kind))
      .filter((opt) => !excludeAccountIds.includes(opt.id));
  }, [communityMembers, communityId, profiles, nonPersonalAccounts, excludeAccountIds, kinds]);

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
                  {opt.kind === 'personal' ? 'Member' : opt.kind === 'fund' ? 'Fund account' : 'Public account'}
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
