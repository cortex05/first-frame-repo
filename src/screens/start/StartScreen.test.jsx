import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import StartScreen from './StartScreen';
import useAuthStore from '../../store/useAuthStore';
import useCaseStore from '../../store/useCaseStore';
import { saveSeating } from '../../api/case';

// jsdom has no canvas: render the Konva tree as plain elements.
// Groups expose their position so tests can watch rows move and rotate.
vi.mock('react-konva', () => {
  const Passthrough = ({ children }) => <div>{children}</div>;
  const Group = ({ children, draggable, x, y, rotation }) => (
    <div
      data-konva="group"
      data-draggable={String(Boolean(draggable))}
      data-x={x}
      data-y={y}
      data-rotation={rotation}
    >
      {children}
    </div>
  );
  return {
    Stage: Passthrough,
    Layer: Passthrough,
    Group,
    Line: () => null,
    Rect: () => null,
    Circle: () => null,
    Text: () => null,
    Transformer: () => null,
  };
});

vi.mock('../../api/case', () => ({ saveSeating: vi.fn() }));

const renderStart = () =>
  render(
    <MemoryRouter initialEntries={['/start/case-1']}>
      <Routes>
        <Route path="/start/:caseId" element={<StartScreen />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  useAuthStore.setState({ userInfo: { token: 'token', userId: 'u-1', role: 'member' } });
  useCaseStore.setState({
    cases: [{ _id: 'case-1', clientName: 'Jane Client', studentNumber: 6, questions: [], answers: {} }],
  });
});

describe('StartScreen labels (spec 013)', () => {
  it('names the row and seat inputs by their labels', () => {
    renderStart();

    expect(screen.getByLabelText('Rows/Depth')).toHaveValue(2);
    expect(screen.getByLabelText('Seats/Width')).toHaveValue(3);
  });

  it('hides the decorative icons from assistive technology', () => {
    const { container } = renderStart();

    const icons = container.querySelectorAll('label svg');
    expect(icons).toHaveLength(2);
    icons.forEach((icon) => {
      expect(icon).toHaveAttribute('aria-hidden', 'true');
      expect(icon).toHaveAttribute('focusable', 'false');
    });
  });
});

describe('StartScreen rows list and keyboard positioning (spec 014)', () => {
  // The drawn row (a draggable Konva group) and its position.
  const rowOnCanvas = (container) =>
    container.querySelector('[data-konva="group"][data-draggable="true"]');
  const position = (container) => {
    const group = rowOnCanvas(container);
    return {
      x: Number(group.dataset.x),
      y: Number(group.dataset.y),
      rotation: Number(group.dataset.rotation),
    };
  };

  const addRowAndSelect = async (user) => {
    await user.click(screen.getByRole('button', { name: '+ Add Row' }));
    const row = screen.getByRole('button', { name: 'Row 1: students 1–6' });
    await user.click(row);
    return row;
  };

  it('summarizes the rows, starting empty', async () => {
    const user = userEvent.setup();
    renderStart();

    expect(screen.getByText('No rows yet.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '+ Add Row' }));

    expect(screen.getByRole('button', { name: 'Row 1: students 1–6' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows move and rotate controls for the selected row', async () => {
    const user = userEvent.setup();
    renderStart();

    const row = await addRowAndSelect(user);

    expect(row).toHaveAttribute('aria-pressed', 'true');
    const controls = within(screen.getByRole('group', { name: 'Move row' }));
    for (const name of ['Move up', 'Move down', 'Move left', 'Move right']) {
      expect(controls.getByRole('button', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Rotate 45°' })).toBeInTheDocument();
  });

  it('moves the row with the buttons, and Undo puts it back', async () => {
    const user = userEvent.setup();
    const { container } = renderStart();
    await addRowAndSelect(user);
    const start = position(container);

    await user.click(screen.getByRole('button', { name: 'Move right' }));
    expect(position(container).x).toBe(start.x + 40);

    await user.click(screen.getByRole('button', { name: /Undo/ }));
    expect(position(container).x).toBe(start.x);
  });

  it('moves with the arrow keys (Shift for small steps) and rotates with R', async () => {
    const user = userEvent.setup();
    const { container } = renderStart();
    const row = await addRowAndSelect(user);
    const start = position(container);

    row.focus();
    await user.keyboard('{ArrowDown}');
    expect(position(container).y).toBe(start.y + 40);
    await user.keyboard('{Shift>}{ArrowDown}{/Shift}');
    expect(position(container).y).toBe(start.y + 48);

    await user.keyboard('r');
    expect(position(container).rotation).toBe(45);
    await user.click(screen.getByRole('button', { name: 'Rotate 45°' }));
    expect(position(container).rotation).toBe(90);
  });

  it('selects an unselected row on its first arrow key, without moving it', async () => {
    const user = userEvent.setup();
    const { container } = renderStart();
    await user.click(screen.getByRole('button', { name: '+ Add Row' }));
    const row = screen.getByRole('button', { name: 'Row 1: students 1–6' });
    const start = position(container);

    row.focus();
    await user.keyboard('{ArrowRight}');

    expect(row).toHaveAttribute('aria-pressed', 'true');
    expect(position(container)).toEqual(start);
  });

  it('hides the canvas from screen readers and names the zoom buttons', async () => {
    const user = userEvent.setup();
    const { container } = renderStart();
    await user.click(screen.getByRole('button', { name: '+ Add Row' }));

    expect(rowOnCanvas(container).closest('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Row 1: students 1–6' }).closest('[aria-hidden="true"]')).toBeNull();
    for (const name of ['Zoom in', 'Zoom out', 'Reset zoom']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
  });
});

describe('StartScreen error contrast (spec 015)', () => {
  it('shows a failed save in the error color made for white dialogs', async () => {
    vi.mocked(saveSeating).mockRejectedValue({ response: { data: { message: 'Nope' } } });
    const user = userEvent.setup();
    renderStart();

    await user.click(screen.getByRole('button', { name: '+ Add Row' }));
    await user.click(screen.getByRole('button', { name: 'Save Chart' }));
    await user.click(screen.getByRole('button', { name: 'Proceed' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Nope');
    expect(alert.style.color).toBe('var(--error-text-surface)');
  });
});

describe('StartScreen structure (spec 017)', () => {
  it('renders the seating screen in a main landmark', () => {
    renderStart();

    expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading', { level: 1 }));
  });
});
