import axiosInstance from './axiosInstance';
import { PLAYLIST_API } from '../config/config';

export const createPlaylist = async (playlistPayload, token) => {
  const res = await axiosInstance.post(PLAYLIST_API.CREATE, playlistPayload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }); 

  return res.data.data;
};
