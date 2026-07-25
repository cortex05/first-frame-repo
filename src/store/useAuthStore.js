import { create } from 'zustand';
import { getUserPlaylists } from '../api/playlist';

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
  playlists: [],

  setPlaylists: (nextPlaylists) => {
    set({ playlists: Array.isArray(nextPlaylists) ? nextPlaylists : [] });
  },

  fetchUserPlaylists: async (token) => {
    if (!token) {
      set({ playlists: [] });
      return [];
    }

    const playlists = await getUserPlaylists(token);
    set({ playlists: Array.isArray(playlists) ? playlists : [] });
    return playlists;
  },

  setUserInfo: (nextUserInfo) => {
    const normalized = {
      token: nextUserInfo?.token ?? '',
      userId: nextUserInfo?.userId ?? '',
      username: nextUserInfo?.username ?? '',
    };

    if (!normalized.token || !normalized.userId || !normalized.username) {
      window.localStorage.removeItem(USER_INFO_STORAGE_KEY);
      set({ userInfo: null, playlists: [] });
      return;
    }

    window.localStorage.setItem(USER_INFO_STORAGE_KEY, JSON.stringify(normalized));
    set({ userInfo: normalized, playlists: [] });
  },

  clearUserInfo: () => {
    window.localStorage.removeItem(USER_INFO_STORAGE_KEY);
    set({ userInfo: null, playlists: [] });
  },
}));

export default useAuthStore;
