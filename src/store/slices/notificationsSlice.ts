import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type NotificationType = 'merge_absorbed';

export interface Notification {
  id: string;
  type: NotificationType;
  createdAt: number;
  read: boolean;
  payload: {
    sourceInitiativeId?: string;
    sourceTitle?: string;
    targetInitiativeId?: string;
    targetTitle?: string;
    communityId?: string;
  };
}

interface NotificationsState {
  items: Notification[];
}

const STORAGE_KEY = 'communityNotifications';

function loadFromStorage(): NotificationsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.items)) {
        return { items: parsed.items };
      }
    }
  } catch {
    // corrupt — ignore
  }
  return { items: [] };
}

function saveToStorage(state: NotificationsState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: state.items }));
}

const slice = createSlice({
  name: 'notifications',
  initialState: loadFromStorage(),
  reducers: {
    addNotification(state, action: PayloadAction<Omit<Notification, 'id' | 'createdAt' | 'read'>>) {
      const n: Notification = {
        id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(),
        read: false,
        ...action.payload,
      };
      state.items.unshift(n);
      if (state.items.length > 100) state.items.length = 100;
      saveToStorage(state);
    },
    markRead(state, action: PayloadAction<string>) {
      const n = state.items.find((x) => x.id === action.payload);
      if (n) {
        n.read = true;
        saveToStorage(state);
      }
    },
    markAllRead(state) {
      state.items.forEach((n) => { n.read = true; });
      saveToStorage(state);
    },
    clear(state) {
      state.items = [];
      saveToStorage(state);
    },
  },
});

export const { addNotification, markRead, markAllRead, clear } = slice.actions;
export default slice.reducer;
