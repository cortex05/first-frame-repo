import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import OwnerPicker from './OwnerPicker';

const users = [
  { _id: 'u-1', username: 'alice', role: 'admin', status: 'active' },
  { _id: 'u-2', username: 'bob', role: 'member', status: 'active' },
  { _id: 'u-3', username: 'carol', role: 'member', status: 'disabled' },
];

describe('OwnerPicker', () => {
  it('lists only active users', () => {
    render(<OwnerPicker users={users} value={[]} onChange={() => {}} />);

    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.queryByText('carol')).not.toBeInTheDocument();
  });

  it('adds and removes ids on toggle', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<OwnerPicker users={users} value={[]} onChange={onChange} />);

    await userEvent.click(screen.getByLabelText(/bob/));
    expect(onChange).toHaveBeenLastCalledWith(['u-2']);

    rerender(<OwnerPicker users={users} value={['u-2']} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText(/bob/));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('shows an empty state when nobody is active', () => {
    render(<OwnerPicker users={[users[2]]} value={[]} onChange={() => {}} />);

    expect(screen.getByText('No users in this account yet.')).toBeInTheDocument();
  });
});
