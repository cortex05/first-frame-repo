export const AUTH_API = {
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
}

export const CASE_API = {
  GET_ALL: "/cases",
  CREATE: "/cases",
  UPDATE: (id) => `/cases/${id}`,
};

export const PLAYLIST_API = {
  GET_ALL: "/playlists",
  GET_BY_ID: (id) => `/playlists/${id}`,
  CREATE: "/playlists",
  UPDATE: (id) => `/playlists/${id}`,
};

export const RECOMMENDED_API = {
  GET_ALL: "/recommended",
  LOOKUP: "/recommended/lookup",
  GET_BY_ID: (id) => `/recommended/${id}`,
  CREATE: "/recommended",
  UPDATE: (id) => `/recommended/${id}`,
  DELETE: (id) => `/recommended/${id}`,
};
