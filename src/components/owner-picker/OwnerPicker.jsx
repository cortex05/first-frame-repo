
import { activeUsersOf } from '../../store/useAccountStore';

import styles from './OwnerPicker.module.css';

/**
 * Checkbox list of the account's active users. Controlled: `value` is the
 * array of selected user ids and `onChange` receives the next array.
 */
const OwnerPicker = ({ users = [], value = [], onChange, disabled = false }) => {
  const activeUsers = activeUsersOf(users);

  const toggle = (userId) => {
    onChange(value.includes(userId) ? value.filter((id) => id !== userId) : [...value, userId]);
  };

  if (activeUsers.length === 0) {
    return <p className={styles.empty}>No users in this account yet.</p>;
  }

  return (
    <ul className={styles.list}>
      {activeUsers.map((user) => {
        const checked = value.includes(user._id);
        return (
          <li key={user._id}>
            <label className={`${styles.item} ${checked ? styles.itemSelected : ''}`}>
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(user._id)}
              />
              <span className={styles.username}>{user.username}</span>
              {user.role === 'admin' && <span className={styles.roleTag}>admin</span>}
            </label>
          </li>
        );
      })}
    </ul>
  );
};

export default OwnerPicker;
