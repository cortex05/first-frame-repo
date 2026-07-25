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

  return {
    ...res.data.data,
    questions: normalizeQuestions(res.data?.data?.questions),
  };
};
