import { createContext, useContext, useEffect, useState } from 'react';
import axiosInstance from '../utils/axiosInstance';

const PermissionsContext = createContext();

export const PermissionsProvider = ({ children }) => {
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
  
    const fetchPermissions = async () => {
      try {
        const res = await axiosInstance.get('/admin/permissions/check/');
        console.log("PERMISSIONS RESPONSE:", res);
        setPermissions(res.data.custom_permissions || {});
      } catch (error) {
        console.error('Error fetching permissions:', error);
        console.log("FULL ERROR RESPONSE:", error.response?.data);
      } finally {
        setLoading(false);
      }
    };
  
    fetchPermissions();
  }, []);
  

  return (
    <PermissionsContext.Provider value={{ permissions, loading }}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => useContext(PermissionsContext);
