import { create } from 'zustand';
import { getUserPlaylists } from '../api/playlist';
import { getRecommendedNames } from '../api/recommended';
import useAccountStore from './useAccountStore';
import useCaseStore from './useCaseStore';

const USER_INFO_STORAGE_KEY = 'userInfo';
const CASES_STORAGE_KEY = 'cases';
const SEATING_DRAFT_PREFIX = 'seating-draft:';

/**
 * The persisted session. isAdmin is the PLATFORM admin (Recommended curator);
 * role is the ACCOUNT role. Both only drive which UI is shown -- every action
 * is authorized server-side against the freshly loaded user, so editing these
 * in localStorage reveals buttons that still fail with a 403.
 */
const normalizeUserInfo = (raw) => ({
  token: raw?.token ?? '',
  userId: raw?.userId ?? '',
  username: raw?.username ?? '',
  isAdmin: Boolean(raw?.isAdmin),
  accountId: raw?.accountId ?? '',
  accountName: raw?.accountName ?? '',
  role: raw?.role === 'admin' ? 'admin' : 'member',
  mustChangePassword: Boolean(raw?.mustChangePassword),
});

// A session saved before accounts existed has no accountId and is discarded,
// which sends that user back to the login screen.
const isCompleteSession = (userInfo) =>
  Boolean(userInfo?.token && userInfo?.userId && userInfo?.username && userInfo?.accountId);

/**
 * Removes everything one user leaves in localStorage, so the next person on a
 * shared machine does not see their cases or seating drafts.
 */
const clearUserData = () => {
  window.localStorage.removeItem(USER_INFO_STORAGE_KEY);
  window.localStorage.removeItem(CASES_STORAGE_KEY);

  const draftKeys = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(SEATING_DRAFT_PREFIX)) {
      draftKeys.push(key);
    }
  }
  draftKeys.forEach((key) => window.localStorage.removeItem(key));

  useCaseStore.getState().getAllCases([]);
  useAccountStore.getState().reset();
};

const safeReadStoredUserInfo = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(USER_INFO_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = normalizeUserInfo(JSON.parse(raw));
    return isCompleteSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const selectIsAccountAdmin = (state) => state.userInfo?.role === 'admin';

const useAuthStore = create((set, get) => ({
  userInfo: safeReadStoredUserInfo(),
  playlists: [],
  // Charges of every recommended set. Recommended sets have no title, so the
  // charge is the identifier. Populated for platform admins only.
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
    const normalized = normalizeUserInfo(nextUserInfo);

    if (!isCompleteSession(normalized)) {
      clearUserData();
      set({ userInfo: null, playlists: [], recommendedNames: [] });
      return;
    }

    window.localStorage.setItem(USER_INFO_STORAGE_KEY, JSON.stringify(normalized));
    set({ userInfo: normalized, playlists: [], recommendedNames: [] });
  },

  /**
   * Merges a few session fields without a new login -- after a password
   * change, an account rename or an admin demoting themselves.
   */
  updateSession: (partial) => {
    const { userInfo } = get();
    if (!userInfo) {
      return;
    }

    const normalized = normalizeUserInfo({ ...userInfo, ...partial });
    window.localStorage.setItem(USER_INFO_STORAGE_KEY, JSON.stringify(normalized));
    set({ userInfo: normalized });
  },

  clearUserInfo: () => {
    clearUserData();
    set({ userInfo: null, playlists: [], recommendedNames: [] });
  },
}));

export default useAuthStore;
