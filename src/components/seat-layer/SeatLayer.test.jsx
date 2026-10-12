import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import SeatLayer from './SeatLayer';

const RECTS = [
  { id: 'r1', assignedStudents: [{ id: 2, x: 100, y: 50 }, { id: 1, x: 150, y: 50 }] },
  { id: 'r2', assignedStudents: [{ id: 3, x: 1000, y: 50 }] },
];

const renderLayer = (props = {}) => {
  const handlers = { onActivate: vi.fn(), onLetter: vi.fn(), onBringIntoView: vi.fn() };
  render(
    <SeatLayer
      rects={RECTS}
      scale={1}
      stagePos={{ x: 0, y: 0 }}
      width={400}
      height={300}
      radius={24}
      getSeatState={(id) => ({ name: `Student ${id}` })}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
};

describe('SeatLayer', () => {
  it('groups seats by row, in chart order', () => {
    renderLayer();

    const row1 = screen.getByRole('group', { name: 'Row 1' });
    expect(within(row1).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      'Student 2',
      'Student 1',
    ]);
    expect(within(screen.getByRole('group', { name: 'Row 2' })).getByRole('button')).toHaveAccessibleName('Student 3');
  });

  it('places each seat over its circle at the current zoom and pan', () => {
    renderLayer({ scale: 2, stagePos: { x: 10, y: 20 } });

    const seat = screen.getByRole('button', { name: 'Student 2' });
    expect(seat).toHaveStyle({ left: '162px', top: '72px', width: '96px', height: '96px' });
  });

  it('activates with Enter and Space, but not while disabled', async () => {
    const user = userEvent.setup();
    const { onActivate } = renderLayer({
      getSeatState: (id) => ({ name: `Student ${id}`, disabled: id === 1 }),
    });

    screen.getByRole('button', { name: 'Student 2' }).focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    screen.getByRole('button', { name: 'Student 1' }).focus();
    await user.keyboard('{Enter}');

    expect(onActivate.mock.calls).toEqual([[2], [2]]);
    expect(screen.getByRole('button', { name: 'Student 1' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('passes option letter keys through', async () => {
    const user = userEvent.setup();
    const { onLetter } = renderLayer();

    screen.getByRole('button', { name: 'Student 2' }).focus();
    await user.keyboard('b');
    await user.keyboard('x');
    await user.keyboard('4');

    expect(onLetter.mock.calls).toEqual([[2, 1], [2, 3]]);
  });

  it('brings an off-screen seat into view on focus, and leaves visible ones alone', () => {
    const { onBringIntoView } = renderLayer();

    screen.getByRole('button', { name: 'Student 2' }).focus();
    expect(onBringIntoView).not.toHaveBeenCalled();

    screen.getByRole('button', { name: 'Student 3' }).focus();
    expect(onBringIntoView).toHaveBeenCalledWith({ x: -800, y: 100 });
  });

  it('marks toggle seats as pressed only when the state says so', () => {
    renderLayer({
      getSeatState: (id) => (id === 2 ? { name: 'Student 2', pressed: true } : { name: `Student ${id}` }),
    });

    expect(screen.getByRole('button', { name: 'Student 2' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Student 1' })).not.toHaveAttribute('aria-pressed');
  });
});
