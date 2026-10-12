import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CreateRecommendedScreen from './CreateRecommendedScreen';
import useAuthStore from '../../store/useAuthStore';
import { expectLabelledQuestionEditor } from '../../test/questionEditor';

vi.mock('../../api/recommended', () => ({ createRecommended: vi.fn() }));

const renderScreen = () =>
  render(
    <MemoryRouter initialEntries={['/create-recommended']}>
      <Routes>
        <Route path="/create-recommended" element={<CreateRecommendedScreen />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  useAuthStore.setState({
    userInfo: {
      token: 'token',
      userId: 'u-1',
      username: 'daniel',
      accountId: 'acc-1',
      role: 'member',
      isAdmin: true,
    },
    recommendedNames: [],
    fetchRecommendedNames: vi.fn(),
  });
});

describe('CreateRecommendedScreen labels (spec 013)', () => {
  it('names the Charge select', () => {
    renderScreen();

    expect(screen.getByLabelText('Charge').tagName).toBe('SELECT');
  });

  it('names every control in the Add Question editor', async () => {
    renderScreen();

    await expectLabelledQuestionEditor(userEvent.setup());
  });
});
