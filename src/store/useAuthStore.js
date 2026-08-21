import { create } from 'zustand';
import { getUserPlaylists } from '../api/playlist';
import { getRecommendedNames } from '../api/recommended';

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
      // Drives which UI is shown, nothing more. Every admin action is
      // authorized server-side against the freshly loaded user, so editing this
      // in localStorage reveals buttons that still fail with a 403.
      isAdmin: Boolean(parsed.isAdmin),
    };
  } catch {
    return null;
  }
};

const useAuthStore = create((set, get) => ({
  userInfo: safeReadStoredUserInfo(),
  playlists: [],
  // Charges of every recommended set. Recommended sets have no title, so the
  // charge is the identifier. Populated for admins only.
  recommendedNames: [],
  isLoadingRecommendedNames: false,

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

  setRecommendedNames: (nextNames) => {
    set({ recommendedNames: Array.isArray(nextNames) ? nextNames : [] });
  },

  fetchRecommendedNames: async (token) => {
    const { userInfo, isLoadingRecommendedNames } = get();
    const activeToken = token ?? userInfo?.token;

    if (!activeToken || !userInfo?.isAdmin) {
      set({ recommendedNames: [] });
      return [];
    }

    // Login and the App-level rehydrate effect can both fire on the same sign-in.
    if (isLoadingRecommendedNames) {
      return get().recommendedNames;
    }

    set({ isLoadingRecommendedNames: true });

    try {
      const names = await getRecommendedNames(activeToken);
      set({ recommendedNames: names });
      return names;
    } catch (error) {
      // Non-critical: a failure here should not take down login or the page
      // that triggered it. The screen shows the empty state instead.
      console.error('Unable to load recommended names:', error);
      set({ recommendedNames: [] });
      return [];
    } finally {
      set({ isLoadingRecommendedNames: false });
    }
  },

  setUserInfo: (nextUserInfo) => {
    const normalized = {
      token: nextUserInfo?.token ?? '',
      userId: nextUserInfo?.userId ?? '',
      username: nextUserInfo?.username ?? '',
      isAdmin: Boolean(nextUserInfo?.isAdmin),
    };

    if (!normalized.token || !normalized.userId || !normalized.username) {
      window.localStorage.removeItem(USER_INFO_STORAGE_KEY);
      set({ userInfo: null, playlists: [], recommendedNames: [] });
      return;
    }

    window.localStorage.setItem(USER_INFO_STORAGE_KEY, JSON.stringify(normalized));
    set({ userInfo: normalized, playlists: [], recommendedNames: [] });
  },

  clearUserInfo: () => {
    window.localStorage.removeItem(USER_INFO_STORAGE_KEY);
    set({ userInfo: null, playlists: [], recommendedNames: [] });
  },
}));

export default useAuthStore;
