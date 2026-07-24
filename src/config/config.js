export const AUTH_API = {
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
}

export const CASE_API = {
  CREATE: "/cases",
  UPDATE: (id) => `/cases/${id}`,
};