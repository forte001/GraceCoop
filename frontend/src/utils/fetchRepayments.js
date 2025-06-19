// src/utils/fetchRepayments.js
import getAxiosByRole from './getAxiosByRole';

export const fetchRepayments = async (endpoint, filters = {}, pathname = window.location.pathname) => {
  const axios = getAxiosByRole(pathname);
  const params = new URLSearchParams(filters).toString();
  const url = `${endpoint}?${params}`;

  const response = await axios.get(url);
  return response.data;
};
