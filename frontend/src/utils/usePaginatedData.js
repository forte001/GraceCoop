// src/utils/usePaginatedData.js
import { useState, useEffect } from 'react';
import { getAxiosByRole } from './getAxiosByRole';

const usePaginatedData = (url, initialFilters = {}, initialPage = 1, pathname = window.location.pathname) => {
  const [fullData, setFullData] = useState({ results: [], count: 0 });
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState({ ...initialFilters });
  const [loading, setLoading] = useState(false);

  const totalPages = Math.ceil(fullData.count / pageSize);
  const axios = getAxiosByRole(pathname);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: currentPage,
          page_size: pageSize,
          ...filters,
        });
        const response = await axios.get(`${url}?${params.toString()}`);
        setFullData(response.data);
      } catch (err) {
        console.error('Failed to fetch paginated data:', err);
        setFullData({ results: [], count: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url, filters, currentPage, pageSize, axios]);

  return {
    data: fullData.results,
    fullData,
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
