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

export default axiosInstance;