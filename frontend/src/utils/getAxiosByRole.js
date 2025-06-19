// src/utils/getAxiosByRole.js
import axiosAdminInstance from './axiosAdminInstance';
import axiosMemberInstance from './axiosMemberInstance';

export const getAxiosByRole = (pathname = window.location.pathname) => {
  if (pathname.startsWith('/admin')) return axiosAdminInstance;
  if (pathname.startsWith('/member')) return axiosMemberInstance;
  return null;
};
