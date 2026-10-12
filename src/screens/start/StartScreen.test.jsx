import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import StartScreen from './StartScreen';
import useAuthStore from '../../store/useAuthStore';
import useCaseStore from '../../store/useCaseStore';

// jsdom has no canvas: render the Konva tree as plain elements.
vi.mock('react-konva', () => {
  const Passthrough = ({ children }) => <div>{children}</div>;
  return {
    Stage: Passthrough,
    Layer: Passthrough,
    Group: Passthrough,
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
