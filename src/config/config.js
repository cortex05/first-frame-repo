export const AUTH_API = {
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
  CHANGE_PASSWORD: "/auth/change-password",
}

export const AGREEMENT_API = {
  CURRENT: "/agreements/current",
  ACCEPT: "/agreements/accept",
};

export const ACCOUNT_API = {
  GET: "/account",
  UPDATE: "/account",
  USERS: "/account/users",
  USER: (id) => `/account/users/${id}`,
};

export const CASE_API = {
  GET_ALL: "/cases",
  CREATE: "/cases",
  UPDATE: (id) => `/cases/${id}`,
  OWNERS: (id) => `/cases/${id}/owners`,
  START: (id) => `/cases/${id}/start`,
  ARCHIVE: (id) => `/cases/${id}/archive`,
  STUDENT_DETAILS: (id, number) => `/cases/${id}/students/${number}/details`,
  ANSWERS: (id, questionId) =>
    `/cases/${id}/questions/${encodeURIComponent(questionId)}/answers`,
  SEATING: (id) => `/cases/${id}/seating`,
};

export const ARCHIVE_API = {
  GET_ALL: "/archived-cases",
  GET_BY_ID: (id) => `/archived-cases/${id}`,
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
