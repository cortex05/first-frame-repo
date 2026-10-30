
import { activeUsersOf } from '../../store/useAccountStore';

import styles from './OwnerPicker.module.css';

/**
 * Checkbox list of the account's active users. Controlled: `value` is the
 * array of selected user ids and `onChange` receives the next array.
 *
 * `labelledBy` / `describedBy` (element ids) turn the list into a named group,
 * for forms where a heading introduces it. Without them the markup is a plain list.
 *
 * `excludeIds` hides users who can't be picked here (a case's attorney, who is
 * always an owner; spec 021). `emptyMessage` is shown when nobody is left.
 */
const OwnerPicker = ({
  users = [],
  value = [],
  onChange,
  disabled = false,
  labelledBy,
  describedBy,
  excludeIds = [],
  emptyMessage = 'No users in this account yet.',
}) => {
  const activeUsers = activeUsersOf(users).filter((user) => !excludeIds.includes(user._id));

  const toggle = (userId) => {
    onChange(value.includes(userId) ? value.filter((id) => id !== userId) : [...value, userId]);
  };

  if (activeUsers.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>;
  }

  const list = (
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

  if (!labelledBy) return list;

  return (
    <div role="group" aria-labelledby={labelledBy} aria-describedby={describedBy}>
      {list}
    </div>
  );
};

export default OwnerPicker;
