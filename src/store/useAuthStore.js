import { create } from 'zustand';

const USER_INFO_STORAGE_KEY = 'userInfo';

const safeReadStoredUserInfo = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(USER_INFO_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.userId || !parsed?.username) {
      return null;
    }

    return {
      token: parsed.token,
      userId: parsed.userId,
      username: parsed.username,
    };
  } catch {
    return null;
  }
};

const useAuthStore = create((set) => ({
  userInfo: safeReadStoredUserInfo(),

  setUserInfo: (nextUserInfo) => {
    const normalized = {
      token: nextUserInfo?.token ?? '',
      userId: nextUserInfo?.userId ?? '',
      username: nextUserInfo?.username ?? '',
    };

    if (!normalized.token || !normalized.userId || !normalized.username) {
      window.localStorage.removeItem(USER_INFO_STORAGE_KEY);
      set({ userInfo: null });
      return;
    }

    window.localStorage.setItem(USER_INFO_STORAGE_KEY, JSON.stringify(normalized));
    set({ userInfo: normalized });
  },

  clearUserInfo: () => {
    window.localStorage.removeItem(USER_INFO_STORAGE_KEY);
    set({ userInfo: null });
  },
}));

export default useAuthStore;
