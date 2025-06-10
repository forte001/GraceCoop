import axiosInstance from './axiosInstance';

export const fetchRepayments = async (endpoint, filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  const url = `${endpoint}?${params}`;

  const response = await axiosInstance.get(url);
  return response.data;
};
