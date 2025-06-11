import { useEffect, useState } from 'react';
import axiosInstance from './axiosInstance';

const usePaginatedData = (url, filters = {}, initialPage = 1) => {
  const [data, setData] = useState([]); // always default to an empty array
  const [count, setCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  const totalPages = Math.ceil(count / pageSize);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        page_size: pageSize,
        ...filters,
      }).toString();

      const response = await axiosInstance.get(`${url}?${params}`);
      const results = response?.data?.results;
      const count = response?.data?.count;

      setData(Array.isArray(results) ? results : []);
      setCount(typeof count === 'number' ? count : 0);
    } catch (error) {
      console.error('Error fetching paginated data:', error);
      setData([]); // fallback to prevent undefined
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, pageSize, JSON.stringify(filters)]);

  return {
    data,
    count,
    currentPage,
    pageSize,
    totalPages,
    loading,
    setCurrentPage,
    setPageSize,
  };
};

export default usePaginatedData;
