import axiosInstance from './axiosInstance';
import { AGREEMENT_API } from '../config/config';

// Public: the register page shows the terms before any account exists.
export const getCurrentAgreement = async () => {
  const res = await axiosInstance.get(AGREEMENT_API.CURRENT);
  return res.data.data;
};

// Account admins only. Returns a fresh session with mustAcceptTerms cleared.
export const acceptAgreement = async ({ termsVersion }, token) => {
  const res = await axiosInstance.post(
    AGREEMENT_API.ACCEPT,
    { termsVersion },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  return res.data.data;
};
