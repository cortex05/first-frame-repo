import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ArchivedCaseScreen from './ArchivedCaseScreen';
import { getArchivedCase } from '../../api/archive';
import useAuthStore from '../../store/useAuthStore';

vi.mock('../../api/archive', () => ({ getArchivedCase: vi.fn() }));
vi.mock('../../api/account', () => ({
  getAccountUsers: vi.fn(async () => [{ _id: 'u-owner', username: 'owner', status: 'active' }]),
}));

const questions = [
  { id: 'q-1', text: 'Intent?', type: 'TRUE_FALSE', options: [{ label: true, value: 5 }, { label: false, value: 0 }] },
  { id: 'q-2', text: 'Credible?', type: 'TRUE_FALSE', options: [{ label: true, value: 3 }, { label: false, value: 0 }] },
];

const archivedCase = (overrides = {}) => ({
  _id: 'a-1',
  clientName: 'Jane Client',
  attorney: 'Alex Attorney',
  category: 'criminal.theft',
  studentNumber: 3,
  owners: ['u-owner'],
  archivedBy: 'u-owner',
  questions,
  // Seated out of order on purpose: the report sorts by student number.
  chartData: { rects: [{ assignedStudents: [{ id: 3 }, { id: 1 }] }, { assignedStudents: [{ id: 2 }] }] },
  answers: {
    'q-1': { 1: { label: 'true', value: 5 }, 2: { label: 'false', value: 0 }, 3: { label: 'true', value: 5 } },
    'q-2': { 1: { label: 'true', value: 3 }, 2: { label: 'false', value: 0 } },
  },
  ...overrides,
});

const renderScreen = () =>
  render(
    <MemoryRouter initialEntries={['/archive/a-1']}>
      <Routes>
        <Route path="/archive/:id" element={<ArchivedCaseScreen />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  useAuthStore.setState({
    userInfo: {
      token: 'token',
      userId: 'u-owner',
      username: 'owner',
      accountId: 'acc-1',
      accountName: 'Firm',
      role: 'member',
      isAdmin: false,
      mustChangePassword: false,
    },
  });
});

describe('ArchivedCaseScreen', () => {
  it('shows one report per seated student, by student number, with risk and totals', async () => {
    vi.mocked(getArchivedCase).mockResolvedValue(archivedCase());
    renderScreen();

    const cards = await screen.findAllByRole('region', { name: /^Student \d+$/ });
    expect(cards.map((card) => card.getAttribute('aria-label'))).toEqual([
      'Student 1',
      'Student 2',
      'Student 3',
    ]);

    // Totals 8, 0, 5 -> range 8, bands at 2.67 / 5.33.
    expect(within(cards[0]).getByText('Risk: High')).toBeInTheDocument();
    expect(within(cards[0]).getByText('Total: 8 pts')).toBeInTheDocument();
    expect(within(cards[1]).getByText('Risk: Low')).toBeInTheDocument();
    expect(within(cards[2]).getByText('Risk: Medium')).toBeInTheDocument();
    expect(within(cards[2]).getByText(/Credible\? — No answer/)).toBeInTheDocument();
  });

  it('keeps the case details', async () => {
    vi.mocked(getArchivedCase).mockResolvedValue(archivedCase());
    renderScreen();

    expect(await screen.findByText('Attorney: Alex Attorney')).toBeInTheDocument();
    expect(await screen.findByText('Owners: owner')).toBeInTheDocument();
    expect(screen.queryByText('No answers recorded.')).not.toBeInTheDocument();
  });

  it('says so when no students were seated or answered', async () => {
    vi.mocked(getArchivedCase).mockResolvedValue(archivedCase({ chartData: {}, answers: {} }));
    renderScreen();

    expect(await screen.findByText('No students were seated for this case.')).toBeInTheDocument();
  });

  it('falls back to the students who answered when there is no seating chart', async () => {
    vi.mocked(getArchivedCase).mockResolvedValue(
      archivedCase({
        chartData: undefined,
        answers: { 'q-1': { 5: { label: 'true', value: 5 } }, 'q-2': { 2: { label: 'true', value: 3 } } },
      }),
    );
    renderScreen();

    const cards = await screen.findAllByRole('region', { name: /^Student \d+$/ });
    expect(cards.map((card) => card.getAttribute('aria-label'))).toEqual(['Student 2', 'Student 5']);
  });
});
