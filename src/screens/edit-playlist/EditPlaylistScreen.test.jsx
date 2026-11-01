import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import EditPlaylistScreen, { UNSAVED_WARNING } from './EditPlaylistScreen';
import { getPlaylistById, updatePlaylist } from '../../api/playlist';
import useAuthStore from '../../store/useAuthStore';
import { expectLabelledQuestionEditor } from '../../test/questionEditor';

vi.mock('../../api/playlist', () => ({ getPlaylistById: vi.fn(), updatePlaylist: vi.fn() }));

const PLAYLIST = {
  _id: 'p-1',
  title: 'Opening',
  questions: [
    {
      id: 'q-1',
      text: 'Was there intent?',
      type: 'TRUE_FALSE',
      options: [
        { label: true, value: 3 },
        { label: false, value: 0 },
      ],
    },
    {
      id: 'q-2',
      text: 'How credible?',
      type: 'MULTIPLE_CHOICE',
      options: [
        { label: 'Very', value: 2 },
        { label: 'Not', value: 0 },
      ],
    },
  ],
};

let fetchUserPlaylists;

const renderScreen = () =>
  render(
    <MemoryRouter initialEntries={['/edit-playlist/p-1']}>
      <Routes>
        <Route path="/edit-playlist/:playlistId" element={<EditPlaylistScreen />} />
        <Route path="/dashboard" element={<p>dashboard page</p>} />
      </Routes>
    </MemoryRouter>,
  );

const renderLoaded = async () => {
  renderScreen();
  await screen.findByRole('heading', { level: 1, name: 'Edit Question Playlist' });
};

beforeEach(() => {
  vi.mocked(getPlaylistById).mockReset().mockResolvedValue(structuredClone(PLAYLIST));
  vi.mocked(updatePlaylist).mockReset().mockResolvedValue({});
  fetchUserPlaylists = vi.fn();
  useAuthStore.setState({
    userInfo: {
      token: 'token',
      userId: 'u-1',
      username: 'daniel',
      accountId: 'acc-1',
      accountName: 'Firm',
      role: 'admin',
      isAdmin: false,
      mustChangePassword: false,
    },
    fetchUserPlaylists,
  });
});

describe('EditPlaylistScreen loading (spec 022)', () => {
  it('shows a loading state, then the current title and questions', async () => {
    renderScreen();

    expect(screen.getByText('Loading playlist...')).toBeInTheDocument();
    await screen.findByRole('heading', { level: 1, name: 'Edit Question Playlist' });

    expect(getPlaylistById).toHaveBeenCalledWith('p-1', 'token');
    expect(screen.getByLabelText('Title')).toHaveValue('Opening');
    expect(screen.getByText('Was there intent?')).toBeInTheDocument();
    expect(screen.getByText('How credible?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update Playlist' })).toBeInTheDocument();
  });

  it('shows the load error and a way back', async () => {
    vi.mocked(getPlaylistById).mockRejectedValue({
      response: { status: 404, data: { message: 'Playlist not found.' } },
    });
    renderScreen();

    expect(await screen.findByRole('alert')).toHaveTextContent('Playlist not found.');
    expect(screen.getByRole('link', { name: 'Back to Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
  });

  it('names every control in the Add Question editor', async () => {
    await renderLoaded();

    await expectLabelledQuestionEditor(userEvent.setup());
  });
});

describe('EditPlaylistScreen local edits (spec 022)', () => {
  it('edits a question in local state only', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    const editor = within(screen.getByRole('dialog', { name: 'Edit Question' }));
    const text = editor.getByLabelText('Question Text');
    await user.clear(text);
    await user.type(text, 'Was there clear intent?');
    await user.click(editor.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Was there clear intent?')).toBeInTheDocument();
    expect(updatePlaylist).not.toHaveBeenCalled();
  });

  it('adds and removes questions without calling the API', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    await user.click(screen.getByRole('button', { name: '+ Add Question' }));
    const editor = within(screen.getByRole('dialog', { name: 'Add Question' }));
    await user.type(editor.getByLabelText('Question Text'), 'A new question');
    await user.click(editor.getByRole('button', { name: 'Add Question' }));
    expect(screen.getByText('A new question')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Delete question' })[0]);
    await user.click(screen.getByRole('button', { name: 'Yes' }));
    expect(screen.queryByText('Was there intent?')).not.toBeInTheDocument();

    expect(updatePlaylist).not.toHaveBeenCalled();
  });
});

describe('EditPlaylistScreen saving (spec 022)', () => {
  it('sends one update with the trimmed title and the question list, then goes to the dashboard', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    const title = screen.getByLabelText('Title');
    await user.clear(title);
    await user.type(title, '  Renamed  ');
    await user.click(screen.getAllByRole('button', { name: 'Edit' })[1]);
    const editor = within(screen.getByRole('dialog', { name: 'Edit Question' }));
    await user.type(editor.getByLabelText('Question Text'), '!');
    await user.click(editor.getByRole('button', { name: 'Save' }));

    await user.click(screen.getByRole('button', { name: 'Update Playlist' }));

    expect(await screen.findByText('dashboard page')).toBeInTheDocument();
    expect(updatePlaylist).toHaveBeenCalledTimes(1);
    const [id, payload, token] = vi.mocked(updatePlaylist).mock.calls[0];
    expect(id).toBe('p-1');
    expect(token).toBe('token');
    expect(payload.title).toBe('Renamed');
    expect(payload.questions.map((q) => [q.id, q.text])).toEqual([
      ['q-1', 'Was there intent?'],
      ['q-2', 'How credible?!'],
    ]);
    expect(payload.questions[1].options).toEqual([
      { label: 'Very', value: 2 },
      { label: 'Not', value: 0 },
    ]);
    expect(fetchUserPlaylists).toHaveBeenCalledWith('token');
  });

  it('refuses an empty title without a request', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    await user.clear(screen.getByLabelText('Title'));
    await user.click(screen.getByRole('button', { name: 'Update Playlist' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Please provide a playlist title.');
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
    expect(updatePlaylist).not.toHaveBeenCalled();
  });

  it('keeps the edits and shows the server message on a conflict', async () => {
    vi.mocked(updatePlaylist).mockRejectedValue({
      response: { status: 409, data: { message: 'Playlist title already exists in this account.' } },
    });
    const user = userEvent.setup();
    await renderLoaded();

    const title = screen.getByLabelText('Title');
    await user.clear(title);
    await user.type(title, 'Taken');
    await user.click(screen.getByRole('button', { name: 'Update Playlist' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Playlist title already exists in this account.',
    );
    expect(screen.getByLabelText('Title')).toHaveValue('Taken');
    expect(screen.getByRole('button', { name: 'Update Playlist' })).toBeEnabled();
    expect(fetchUserPlaylists).not.toHaveBeenCalled();
  });

  it('leaves without saving on Cancel', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(await screen.findByText('dashboard page')).toBeInTheDocument();
    expect(updatePlaylist).not.toHaveBeenCalled();
  });
});

describe('EditPlaylistScreen navbar warning (spec 022)', () => {
  it('asks before leaving through the navbar; Cancel keeps the edits, Proceed leaves', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    const title = screen.getByLabelText('Title');
    await user.clear(title);
    await user.type(title, 'Draft');

    await user.click(screen.getByRole('link', { name: 'Home' }));
    let dialog = within(screen.getByRole('dialog', { name: 'Leave This Page?' }));
    expect(dialog.getByText(UNSAVED_WARNING)).toBeInTheDocument();
    expect(UNSAVED_WARNING).toBe('Unsaved changes will be lost. Do you wish to proceed?');

    await user.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Draft');

    await user.click(screen.getByRole('link', { name: 'Home' }));
    dialog = within(screen.getByRole('dialog', { name: 'Leave This Page?' }));
    await user.click(dialog.getByRole('button', { name: 'Proceed' }));

    expect(await screen.findByText('dashboard page')).toBeInTheDocument();
    expect(updatePlaylist).not.toHaveBeenCalled();
  });
});
