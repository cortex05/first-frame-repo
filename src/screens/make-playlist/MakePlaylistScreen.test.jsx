import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MakePlaylistScreen from './MakePlaylistScreen';
import useAuthStore from '../../store/useAuthStore';
import { expectLabelledQuestionEditor } from '../../test/questionEditor';

vi.mock('../../api/playlist', () => ({ createPlaylist: vi.fn() }));

const renderScreen = () =>
  render(
    <MemoryRouter initialEntries={['/make-playlist']}>
      <Routes>
        <Route path="/make-playlist" element={<MakePlaylistScreen />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  useAuthStore.setState({
    userInfo: { token: 'token', userId: 'u-1', username: 'daniel', accountId: 'acc-1', role: 'member' },
    fetchUserPlaylists: vi.fn(),
  });
});

describe('MakePlaylistScreen labels (spec 013)', () => {
  it('names the Title field', () => {
    renderScreen();

    expect(screen.getByLabelText('Title')).toHaveAttribute('placeholder', 'Playlist title');
  });

  it('names every control in the Add Question editor', async () => {
    renderScreen();

    await expectLabelledQuestionEditor(userEvent.setup());
  });
});
