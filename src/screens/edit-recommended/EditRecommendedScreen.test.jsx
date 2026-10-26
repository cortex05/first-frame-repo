import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import EditRecommendedScreen from './EditRecommendedScreen';
import { getRecommendedForCharge } from '../../api/recommended';
import useAuthStore from '../../store/useAuthStore';
import { expectLabelledQuestionEditor } from '../../test/questionEditor';

vi.mock('../../api/recommended', () => ({
  getRecommendedForCharge: vi.fn(),
  updateRecommended: vi.fn(),
  deleteRecommended: vi.fn(),
}));

const renderEdit = () =>
  render(
    <MemoryRouter initialEntries={['/recommended/Theft']}>
      <Routes>
        <Route path="/recommended/:charge" element={<EditRecommendedScreen />} />
        <Route path="/recommended" element={<p>Recommended list</p>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  window.scrollTo = vi.fn();
  vi.mocked(getRecommendedForCharge).mockReset();
  useAuthStore.setState({
    userInfo: {
      token: 'token',
      userId: 'u-1',
      username: 'platform',
      accountId: 'acc-1',
      accountName: 'Firm',
      role: 'member',
      isAdmin: true,
      mustChangePassword: false,
    },
    fetchRecommendedNames: vi.fn(),
  });
});

describe('EditRecommendedScreen back link (spec 011)', () => {
  it('is a real link back to the recommended list that works from the keyboard', async () => {
    vi.mocked(getRecommendedForCharge).mockResolvedValue(null);
    const user = userEvent.setup();
    renderEdit();

    expect(await screen.findByText('No recommended playlist exists for Theft.')).toBeInTheDocument();
    const back = screen.getByRole('link', { name: 'Back to Recommended Playlists' });
    expect(back).toHaveAttribute('href', '/recommended');

    back.focus();
    await user.keyboard('{Enter}');

    expect(screen.getByText('Recommended list')).toBeInTheDocument();
  });
});

describe('EditRecommendedScreen form labels (spec 013)', () => {
  it('names every control in the Add Question editor', async () => {
    vi.mocked(getRecommendedForCharge).mockResolvedValue({
      _id: 'rec-1',
      charge: 'Theft',
      questions: [{ id: 'q-1', text: 'Intent?', type: 'TRUE_FALSE', options: [] }],
    });
    renderEdit();
    await screen.findByRole('heading', { name: 'Charge: Theft' });

    await expectLabelledQuestionEditor(userEvent.setup());
  });
});

describe('EditRecommendedScreen structure (spec 017)', () => {
  it('keeps the not-found message in a main landmark', async () => {
    vi.mocked(getRecommendedForCharge).mockResolvedValue(null);
    renderEdit();

    await screen.findByText('No recommended playlist exists for Theft.');
    expect(screen.getByRole('main')).toContainElement(screen.getByText('No recommended playlist exists for Theft.'));
  });
});
