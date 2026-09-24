import { beforeEach, describe, expect, it, vi } from 'vitest';

const SESSION = {
  token: 'token',
  userId: 'u-1',
  username: 'daniel',
  isAdmin: false,
  accountId: 'acc-1',
  accountName: 'Cortes Law',
  role: 'admin',
  mustChangePassword: false,
};

// The store reads localStorage when it is created, so each test seeds storage
// first and then imports a fresh copy of the module.
const loadStore = async () => {
  vi.resetModules();
  const module = await import('./useAuthStore');
  const caseModule = await import('./useCaseStore');
  return { useAuthStore: module.default, useCaseStore: caseModule.default, module };
};

beforeEach(() => {
  window.localStorage.clear();
});

describe('useAuthStore', () => {
  it('discards a session saved before accounts existed', async () => {
    window.localStorage.setItem(
      'userInfo',
      JSON.stringify({ token: 'old', userId: 'u-1', username: 'daniel', isAdmin: false }),
    );

    const { useAuthStore } = await loadStore();

    expect(useAuthStore.getState().userInfo).toBeNull();
  });

  it('rehydrates a complete session', async () => {
    window.localStorage.setItem('userInfo', JSON.stringify(SESSION));

    const { useAuthStore } = await loadStore();

    expect(useAuthStore.getState().userInfo).toEqual(SESSION);
  });

  it('persists the account fields on setUserInfo', async () => {
    const { useAuthStore, module } = await loadStore();

    useAuthStore.getState().setUserInfo({ ...SESSION, mustChangePassword: true });

    const stored = JSON.parse(window.localStorage.getItem('userInfo'));
    expect(stored).toMatchObject({
      accountId: 'acc-1',
      accountName: 'Cortes Law',
      role: 'admin',
      mustChangePassword: true,
    });
    expect(module.selectIsAccountAdmin(useAuthStore.getState())).toBe(true);
  });

  it('merges partial updates with updateSession', async () => {
    const { useAuthStore, module } = await loadStore();
    useAuthStore.getState().setUserInfo(SESSION);

    useAuthStore.getState().updateSession({ role: 'member', accountName: 'Renamed' });

    expect(useAuthStore.getState().userInfo).toMatchObject({
      token: 'token',
      role: 'member',
      accountName: 'Renamed',
    });
    expect(module.selectIsAccountAdmin(useAuthStore.getState())).toBe(false);
    expect(JSON.parse(window.localStorage.getItem('userInfo')).accountName).toBe('Renamed');
  });

  it('clears cases and seating drafts on logout, and nothing else', async () => {
    const { useAuthStore, useCaseStore } = await loadStore();
    useAuthStore.getState().setUserInfo(SESSION);
    useCaseStore.getState().getAllCases([{ _id: 'c-1' }]);
    window.localStorage.setItem('cases', JSON.stringify([{ _id: 'c-1' }]));
    window.localStorage.setItem('seating-draft:c-1', '{}');
    window.localStorage.setItem('seating-draft:c-2', '{}');
    window.localStorage.setItem('theme', 'dark');

    useAuthStore.getState().clearUserInfo();

    expect(useAuthStore.getState().userInfo).toBeNull();
    expect(useCaseStore.getState().cases).toEqual([]);
    expect(window.localStorage.getItem('userInfo')).toBeNull();
    expect(window.localStorage.getItem('cases')).toBeNull();
    expect(window.localStorage.getItem('seating-draft:c-1')).toBeNull();
    expect(window.localStorage.getItem('seating-draft:c-2')).toBeNull();
    expect(window.localStorage.getItem('theme')).toBe('dark');
  });
});
