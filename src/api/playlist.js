import axiosInstance from './axiosInstance';
import { PLAYLIST_API } from '../config/config';
import { normalizeQuestions } from '../utils/questionNormalization';

export const getUserPlaylists = async (token) => {
  const res = await axiosInstance.get(PLAYLIST_API.GET_ALL, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data?.playlists ?? [];
};

export const getPlaylistById = async (playlistId, token) => {
  const res = await axiosInstance.get(PLAYLIST_API.GET_BY_ID(playlistId), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const playlist = res.data?.data ?? res.data?.playlist ?? res.data ?? null;
  if (!playlist) return null;

  return {
    ...playlist,
    questions: normalizeQuestions(playlist.questions),
  };
};

export const createPlaylist = async (playlistPayload, token) => {
  const normalizedPayload = {
    ...playlistPayload,
    questions: normalizeQuestions(playlistPayload.questions),
  };

  const res = await axiosInstance.post(PLAYLIST_API.CREATE, normalizedPayload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }); 

  // The backend answers { playlist }; `data` is the pre-accounts shape.
  const playlist = res.data?.playlist ?? res.data?.data ?? {};
  return {
    ...playlist,
    questions: normalizeQuestions(playlist.questions),
  };
};

/** Replaces the title and/or the whole question list (account admins only). */
export const updatePlaylist = async (playlistId, { title, questions }, token) => {
  const payload = {};
  if (title !== undefined) payload.title = title;
  if (questions !== undefined) payload.questions = normalizeQuestions(questions);

  const res = await axiosInstance.patch(PLAYLIST_API.UPDATE(playlistId), payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const playlist = res.data?.playlist ?? {};
  return {
    ...playlist,
    questions: normalizeQuestions(playlist.questions),
  };
};

/** Deletes the playlist for everyone in the account (account admins only). */
export const deletePlaylist = async (playlistId, token) => {
  await axiosInstance.delete(PLAYLIST_API.DELETE(playlistId), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};
