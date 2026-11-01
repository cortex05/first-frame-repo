import { beforeEach, describe, expect, it, vi } from 'vitest';

import axiosInstance from './axiosInstance';
import { deletePlaylist, updatePlaylist } from './playlist';

vi.mock('./axiosInstance', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const AUTH = { headers: { Authorization: 'Bearer token' } };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('updatePlaylist (spec 022)', () => {
  it('PATCHes the normalized title and questions, and returns the normalized playlist', async () => {
    vi.mocked(axiosInstance.patch).mockResolvedValue({
      data: {
        playlist: {
          _id: 'p-1',
          title: 'Renamed',
          questions: [
            {
              id: 'q-1',
              text: 'Intent?',
              type: 'TRUE_FALSE',
              options: [
                { label: 'true', value: '3' },
                { label: 'false', value: 0 },
              ],
            },
          ],
        },
      },
    });

    const result = await updatePlaylist(
      'p-1',
      {
        title: 'Renamed',
        questions: [
          {
            id: 'q-1',
            text: 'Intent?',
            type: 'TRUE_FALSE',
            options: [
              { label: 'true', value: '3' },
              { label: 'false', value: '0' },
            ],
            answers: { 1: 'x' },
          },
        ],
      },
      'token',
    );

    expect(axiosInstance.patch).toHaveBeenCalledWith(
      '/playlists/p-1',
      {
        title: 'Renamed',
        questions: [
          {
            id: 'q-1',
            text: 'Intent?',
            type: 'TRUE_FALSE',
            options: [
              { label: true, value: 3 },
              { label: false, value: 0 },
            ],
          },
        ],
      },
      AUTH,
    );
    expect(result._id).toBe('p-1');
    expect(result.questions[0].options).toEqual([
      { label: true, value: 3 },
      { label: false, value: 0 },
    ]);
  });
});

describe('deletePlaylist (spec 022)', () => {
  it('DELETEs the playlist with the Bearer header', async () => {
    vi.mocked(axiosInstance.delete).mockResolvedValue({ data: { message: 'Playlist deleted.' } });

    await deletePlaylist('p-1', 'token');

    expect(axiosInstance.delete).toHaveBeenCalledWith('/playlists/p-1', AUTH);
  });
});
