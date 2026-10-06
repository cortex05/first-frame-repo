import axios from "axios";

const resolveApiBaseUrl = () => {
  const rawBaseUrl =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
  const trimmedBaseUrl = String(rawBaseUrl).trim().replace(/\/+$/, "");

  if (/\/api$/i.test(trimmedBaseUrl)) {
    return trimmedBaseUrl;
  }

  return `${trimmedBaseUrl}/api`;
};

const axiosInstance = axios.create({
  baseURL: resolveApiBaseUrl(),
});

let termsRequiredHandler = null;

/**
 * Called when any request comes back 403 TERMS_ACCEPTANCE_REQUIRED: a new
 * Terms of Service version went live while the user was signed in. The auth
 * store registers it, so this module does not import the store.
 */
export const setTermsRequiredHandler = (handler) => {
  termsRequiredHandler = handler;
};

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error?.response?.status === 403 &&
      error.response.data?.code === "TERMS_ACCEPTANCE_REQUIRED"
    ) {
      termsRequiredHandler?.();
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;