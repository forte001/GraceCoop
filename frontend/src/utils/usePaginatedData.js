import { useEffect, useState } from 'react';
import axiosInstance from './axiosInstance';

const usePaginatedData = (url, filters = {}, initialPage = 1) => {
  const [data, setData] = useState([]);
  const [count, setCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  const totalPages = Math.ceil(count / pageSize);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams({
        page: currentPage,
        page_size: pageSize,
        ...filters,
      }).toString();

      const response = await axiosInstance.get(`${url}?${params}`);
      console.log("Fetched paginated data:", response.data);
      setData(response.data.results || []);
      setCount(response.data.count || 0);
    } catch (error) {
      console.error('Error fetching paginated data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Include JSON.stringify to watch deep equality changes
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

