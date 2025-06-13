// utils/usePaginatedData.js
import { useState, useEffect } from 'react';
import axiosInstance from './axiosInstance';

const usePaginatedData = (url, initialFilters = {}, initialPage = 1) => {
  const [fullData, setFullData] = useState({ results: [], count: 0 }); // full response
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState({ ...initialFilters });
  const [loading, setLoading] = useState(false);

  const totalPages = Math.ceil(fullData.count / pageSize);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: currentPage,
          page_size: pageSize,
          ...filters,
        });
        const response = await axiosInstance.get(`${url}?${params.toString()}`);
        setFullData(response.data);
      } catch (err) {
        console.error('Failed to fetch paginated data:', err);
        setFullData({ results: [], count: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url, filters, currentPage, pageSize]);

  return {
    data: fullData.results,       // ✅ backward-compatible raw array
    fullData,                     // ✅ full response (e.g. for pagination)
    loading,
    filters,
    setFilters,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
  };
};

export default usePaginatedData;
