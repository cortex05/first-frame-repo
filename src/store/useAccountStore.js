import { create } from 'zustand';
import {
  createAccountUser,
  getAccount,
  getAccountUsers,
  updateAccount,
  updateAccountUser,
} from '../api/account';

/**
 * The signed-in user's account and its users. The user list feeds the owner
 * pickers and turns user ids (owners, archivedBy) into names.
 */
const useAccountStore = create((set, get) => ({
  account: null,
  users: [],
  isLoadingUsers: false,

  fetchAccount: async (token) => {
    const account = await getAccount(token);
    set({ account });
    return account;
  },

  renameAccount: async (name, token) => {
    const account = await updateAccount({ name }, token);
    set({ account });
    return account;
  },

  fetchAccountUsers: async (token) => {
    if (!token) {
      set({ users: [] });
      return [];
    }

    set({ isLoadingUsers: true });
    try {
      const users = await getAccountUsers(token);
      set({ users });
      return users;
    } finally {
      set({ isLoadingUsers: false });
    }
  },

  createUser: async (payload, token) => {
    const user = await createAccountUser(payload, token);
    if (user) {
      set({ users: [...get().users, user] });
    }
    return user;
  },

  updateUser: async (userId, patch, token) => {
    const user = await updateAccountUser(userId, patch, token);
    if (user) {
      set({ users: get().users.map((existing) => (existing._id === user._id ? user : existing)) });
    }
    return user;
  },

  reset: () => set({ account: null, users: [], isLoadingUsers: false }),
}));

// Plain helper, not a store selector: filtering inside a selector returns a new
// array every time, which zustand v5 treats as a change and re-renders forever.
export const activeUsersOf = (users) => users.filter((user) => user.status === 'active');

export const usernameFor = (users, userId) =>
  users.find((user) => user._id === String(userId))?.username ?? 'Unknown';

export default useAccountStore;
