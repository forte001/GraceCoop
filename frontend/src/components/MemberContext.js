import React, { createContext, useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosInstance';

export const MemberContext = createContext();

export const MemberProvider = ({ children }) => {
  const [memberProfile, setMemberProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMemberProfile = async () => {
    try {
      const response = await axiosInstance.get('/members/my-profile/');
      setMemberProfile(response.data);
    } catch (error) {
      console.error('Error fetching member profile:', error);
      setMemberProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberProfile();
  }, []);

  return (
    <MemberContext.Provider value={{ memberProfile, loading, refreshProfile: fetchMemberProfile }}>
      {children}
    </MemberContext.Provider>
  );
};
