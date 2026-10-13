import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import StudentSortModal from './StudentSortModal';

const SCORES = { 1: 6, 2: 3, 3: 0 };
const TIERS = { 1: 'high', 2: 'medium', 3: 'low' };

const renderSort = (order = 'high') => {
  const onSelectStudent = vi.fn();
  const onClose = vi.fn();
  render(
    <StudentSortModal
      order={order}
      students={[{ id: 2 }, { id: 3 }, { id: 1 }]}
      getScore={(id) => SCORES[id]}
      getTier={(id) => TIERS[id]}
      onSelectStudent={onSelectStudent}
      onClose={onClose}
    />,
  );
  return { onSelectStudent, onClose };
};

const rows = () =>
  within(screen.getByRole('dialog'))
    .getAllByRole('button')
    .filter((b) => b.textContent.startsWith('#'))
    .map((b) => b.textContent);

describe('StudentSortModal (spec 012)', () => {
  it('is a dialog named by its order, listing students by score', () => {
    renderSort('high');

    expect(screen.getByRole('dialog', { name: 'High to Low' })).toHaveFocus();
    expect(rows()).toEqual(['#1 — 6 · High', '#2 — 3 · Medium', '#3 — 0 · Low']);
  });

  it('sorts low to high', () => {
    renderSort('low');

    expect(screen.getByRole('dialog', { name: 'Low to High' })).toBeInTheDocument();
    expect(rows()).toEqual(['#3 — 0 · Low', '#2 — 3 · Medium', '#1 — 6 · High']);
  });

  it('opens a student', async () => {
    const { onSelectStudent } = renderSort();

    await userEvent.click(screen.getByRole('button', { name: '#2 — 3 · Medium' }));

    expect(onSelectStudent).toHaveBeenCalledWith(2);
  });

  it('closes with the labeled ×, Escape and the backdrop, but not a click inside', async () => {
    const { onClose } = renderSort();
    const dialog = screen.getByRole('dialog');

    await userEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await userEvent.keyboard('{Escape}');
    await userEvent.click(dialog.parentElement);

    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
