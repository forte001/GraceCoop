import { useEffect, useState } from 'react';
import axiosInstance from './axiosInstance';

const usePaginatedData = (url, dependencies = []) => {
  const [data, setData] = useState([]);
  const [count, setCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  const totalPages = Math.ceil(count / pageSize);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`${url}?page=${currentPage}`);
      setData(response.data.results);
      setCount(response.data.count);
      setPageSize(response.data.results.length || 10);
    } catch (error) {
      console.error('Error fetching paginated data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Defensive check: ensure dependencies is always an array
  const safeDependencies = Array.isArray(dependencies) ? dependencies : [];

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, ...safeDependencies]);

  return {
    data,
    count,
    currentPage,
    totalPages,
    setCurrentPage,
    loading,
  };
};

export default usePaginatedData;
