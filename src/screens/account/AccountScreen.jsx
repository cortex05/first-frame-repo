import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import TopNavbar from '../../components/top-navbar/TopNavbar';
import useAccountStore from '../../store/useAccountStore';
import useAuthStore from '../../store/useAuthStore';

import styles from './AccountScreen.module.css';

const MIN_PASSWORD_LENGTH = 8;
const EMPTY_NEW_USER = { username: '', email: '', password: '', role: 'member' };

const errorMessage = (requestError, fallback) =>
  requestError?.response?.data?.message || fallback;

/**
 * Account administration: rename the account, add users with a temporary
 * password, and change users' roles or disable them. Account admins only.
 */
const AccountScreen = () => {
  const navigate = useNavigate();
  const userInfo = useAuthStore((state) => state.userInfo);
  const updateSession = useAuthStore((state) => state.updateSession);

  const account = useAccountStore((state) => state.account);
  const users = useAccountStore((state) => state.users);
  const isLoadingUsers = useAccountStore((state) => state.isLoadingUsers);
  const fetchAccount = useAccountStore((state) => state.fetchAccount);
  const fetchAccountUsers = useAccountStore((state) => state.fetchAccountUsers);
  const renameAccount = useAccountStore((state) => state.renameAccount);
  const createUser = useAccountStore((state) => state.createUser);
  const updateUser = useAccountStore((state) => state.updateUser);

  const [accountName, setAccountName] = useState(userInfo?.accountName ?? '');
  const [accountMessage, setAccountMessage] = useState('');
  const [loadError, setLoadError] = useState('');

  const [newUser, setNewUser] = useState(EMPTY_NEW_USER);
  const [createError, setCreateError] = useState('');
  const [createMessage, setCreateMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Per-row error, keyed by user id, so the last-admin refusal shows where it happened.
  const [rowErrors, setRowErrors] = useState({});
  const [pendingUserId, setPendingUserId] = useState(null);

  useEffect(() => {
    if (!userInfo?.token) return;

    Promise.all([fetchAccount(userInfo.token), fetchAccountUsers(userInfo.token)])
      .then(([loadedAccount]) => {
        if (loadedAccount?.name) setAccountName(loadedAccount.name);
      })
      .catch((requestError) => setLoadError(errorMessage(requestError, 'Unable to load the account.')));
  }, [userInfo?.token]);

  const handleRename = async (event) => {
    event.preventDefault();
    setAccountMessage('');

    try {
      const renamed = await renameAccount(accountName.trim(), userInfo.token);
      updateSession({ accountName: renamed.name });
      setAccountMessage('Account name saved.');
    } catch (requestError) {
      setAccountMessage(errorMessage(requestError, 'Unable to rename the account.'));
    }
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setCreateError('');
    setCreateMessage('');

    if (newUser.password.length < MIN_PASSWORD_LENGTH) {
      setCreateError(`The temporary password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setIsCreating(true);
    try {
      const created = await createUser(
        {
          username: newUser.username.trim(),
          email: newUser.email.trim(),
          password: newUser.password,
          role: newUser.role,
        },
        userInfo.token,
      );
      setNewUser(EMPTY_NEW_USER);
      setCreateMessage(
        `${created.username} was added. Share the temporary password with them; they will choose their own at first login.`,
      );
    } catch (requestError) {
      setCreateError(errorMessage(requestError, 'Unable to add the user.'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleUserChange = async (user, patch) => {
    setRowErrors((prev) => ({ ...prev, [user._id]: '' }));
    setPendingUserId(user._id);

    try {
      const updated = await updateUser(user._id, patch, userInfo.token);

      // An admin who just gave up their own admin role can no longer use this page.
      if (updated._id === String(userInfo.userId) && updated.role !== 'admin') {
        updateSession({ role: 'member' });
        navigate('/home', { replace: true });
      }
    } catch (requestError) {
      setRowErrors((prev) => ({
        ...prev,
        [user._id]: errorMessage(requestError, 'Unable to update this user.'),
      }));
    } finally {
      setPendingUserId(null);
    }
  };

  return (
    <React.Fragment>
      <TopNavbar />

      <div className={styles.container}>
        <h1>Account</h1>
        <p className={styles.subtitle}>Manage your account and the people who use it.</p>

        {loadError && <p className={styles.error}>{loadError}</p>}

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Account Name</h2>
          <form className={styles.inlineForm} onSubmit={handleRename}>
            <input
              className={styles.inputStyle}
              type="text"
              value={accountName}
              maxLength={80}
              onChange={(event) => setAccountName(event.target.value)}
              aria-label="Account name"
            />
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={!accountName.trim() || accountName.trim() === account?.name}
            >
              Save
            </button>
          </form>
          {accountMessage && <p className={styles.hint}>{accountMessage}</p>}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Users</h2>

          {isLoadingUsers && users.length === 0 ? (
            <p className={styles.hint}>Loading users...</p>
          ) : (
            <ul className={styles.userList}>
              {users.map((user) => {
                const isSelf = user._id === String(userInfo?.userId);
                const isPending = pendingUserId === user._id;
                return (
                  <li
                    key={user._id}
                    className={`${styles.userRow} ${user.status === 'disabled' ? styles.userDisabled : ''}`}
                  >
                    <div className={styles.userIdentity}>
                      <span className={styles.username}>
                        {user.username}
                        {isSelf && ' (you)'}
                      </span>
                      <span className={styles.email}>{user.email}</span>
                      {user.mustChangePassword && (
                        <span className={styles.pendingTag}>Temporary password</span>
                      )}
                    </div>

                    <div className={styles.userControls}>
                      <select
                        className={styles.selectStyle}
                        value={user.role}
                        disabled={isPending}
                        aria-label={`Role for ${user.username}`}
                        onChange={(event) => handleUserChange(user, { role: event.target.value })}
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>

                      <button
                        type="button"
                        className={user.status === 'active' ? styles.declineButton : styles.confirmButton}
                        disabled={isPending}
                        onClick={() =>
                          handleUserChange(user, {
                            status: user.status === 'active' ? 'disabled' : 'active',
                          })
                        }
                      >
                        {user.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                    </div>

                    {rowErrors[user._id] && <p className={styles.rowError}>{rowErrors[user._id]}</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Add a User</h2>
          <p className={styles.hint}>
            Give the new user a temporary password. They will have to choose their own the
            first time they log in.
          </p>

          <form className={styles.form} onSubmit={handleCreateUser}>
            <div className={styles.fieldStyle}>
              <label className={styles.labelStyle} htmlFor="new-user-username">Username</label>
              <input
                id="new-user-username"
                className={styles.inputStyle}
                type="text"
                value={newUser.username}
                onChange={(event) => setNewUser((prev) => ({ ...prev, username: event.target.value }))}
                required
                autoComplete="off"
              />
            </div>

            <div className={styles.fieldStyle}>
              <label className={styles.labelStyle} htmlFor="new-user-email">Email</label>
              <input
                id="new-user-email"
                className={styles.inputStyle}
                type="email"
                value={newUser.email}
                onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))}
                required
                autoComplete="off"
              />
            </div>

            <div className={styles.fieldStyle}>
              <label className={styles.labelStyle} htmlFor="new-user-password">Temporary Password</label>
              <input
                id="new-user-password"
                className={styles.inputStyle}
                type="text"
                value={newUser.password}
                onChange={(event) => setNewUser((prev) => ({ ...prev, password: event.target.value }))}
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                required
                autoComplete="off"
              />
            </div>

            <div className={styles.fieldStyle}>
              <label className={styles.labelStyle} htmlFor="new-user-role">Role</label>
              <select
                id="new-user-role"
                className={styles.selectStyle}
                value={newUser.role}
                onChange={(event) => setNewUser((prev) => ({ ...prev, role: event.target.value }))}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {createError && <p className={styles.error}>{createError}</p>}
            {createMessage && <p className={styles.success}>{createMessage}</p>}

            <button type="submit" className={styles.primaryButton} disabled={isCreating}>
              {isCreating ? 'Adding...' : 'Add User'}
            </button>
          </form>
        </section>
      </div>
    </React.Fragment>
  );
};

export default AccountScreen;
