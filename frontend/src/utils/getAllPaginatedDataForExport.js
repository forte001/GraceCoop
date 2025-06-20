// utils/getAllPaginatedDataForExport.js
import getAxiosByRole from './getAxiosByRole';

const getAllPaginatedDataForExport = async ({
  url,
  filters = {},
  pageSize = 1000,
  pathname = window.location.pathname,
  transformFn = null, // Optional mapping function
  maxLimit = 5000, // Prevent huge exports
}) => {
  const axios = getAxiosByRole(pathname);
  let allResults = [];
  let currentPage = 1;
  let totalPages = 1;

  try {
    while (currentPage <= totalPages) {
      const params = new URLSearchParams({
        page: currentPage,
        page_size: pageSize,
        ...filters,
      });

      const response = await axios.get(`${url}?${params.toString()}`);
      const { results, count } = response.data;

      if (results?.length) allResults.push(...results);
      totalPages = Math.ceil(count / pageSize);
      currentPage++;

      if (allResults.length > maxLimit) {
        console.warn(`Exceeded export limit (${maxLimit} records)`);
        break;
      }
    }

    // Optional transformation (e.g. format currency, dates, etc.)
    return transformFn ? allResults.map(transformFn) : allResults;
  } catch (error) {
    console.error('❌ Error during full export fetch:', error);
    return [];
  }
};

export default getAllPaginatedDataForExport;
