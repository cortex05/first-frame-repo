import axiosInstance from './axiosInstance';
import { PLAYLIST_API } from '../config/config';

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

  return res.data?.data ?? res.data?.playlist ?? res.data ?? null;
};

export const createPlaylist = async (playlistPayload, token) => {
  const res = await axiosInstance.post(PLAYLIST_API.CREATE, playlistPayload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }); 

  return res.data.data;
};
