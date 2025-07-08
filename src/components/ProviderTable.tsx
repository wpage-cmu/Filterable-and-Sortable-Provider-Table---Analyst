import React, { useEffect, useMemo, useState } from 'react';
import { ChevronUpIcon, ChevronDownIcon, CheckIcon } from 'lucide-react';
export const ProviderTable = ({
  data,
  columns,
  initialSort = null,
  onFiltersChange
}) => {
  const [sortConfig, setSortConfig] = useState(initialSort || {
    key: null,
    direction: 'asc'
  });
  // Update sort config when initialSort changes
  useEffect(() => {
    if (initialSort) {
      setSortConfig(initialSort);
    }
  }, [initialSort]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  // Initialize filters with empty arrays for multiselect columns
  const [filters, setFilters] = useState({});
  // Move filter initialization to useEffect
  useEffect(() => {
    const initialFilters = {};
    columns.forEach(column => {
      if (isMultiselectColumn(column.accessor)) {
        initialFilters[column.accessor] = [];
      }
    });
    setFilters(initialFilters);
  }, []); // Empty dependency array since we only want this to run once
  
  // Notify parent component when filters change
  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange(filters);
    }
  }, [filters, onFiltersChange]);
  
  const [openDropdown, setOpenDropdown] = useState(null);
  // Get unique values for dropdown filters
  const getUniqueValues = columnId => {
    return [...new Set(data.map(item => item[columnId]))].filter(Boolean);
  };
  // Check if column should use multiselect
  const isMultiselectColumn = columnId => {
    return ['attestationStatus', 'specialty', 'primaryPracticeState', 'otherPracticeStates'].includes(columnId);
  };
  // Apply filters to data
  const filteredData = data.filter(item => {
    return Object.keys(filters).every(key => {
      if (!filters[key] || filters[key].length === 0) return true;
      if (Array.isArray(filters[key])) {
        // Handle array-type columns (like otherPracticeStates)
        if (Array.isArray(item[key])) {
          return item[key].some(value => filters[key].includes(value));
        }
        return filters[key].includes(item[key]);
      }
      const itemValue = item[key]?.toString().toLowerCase() || '';
      const filterValue = filters[key].toLowerCase();
      return itemValue.includes(filterValue);
    });
  });
  // Apply sorting to filtered data
  const sortedData = useMemo(() => {
    let sortableItems = [...filteredData];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);
  const requestSort = key => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({
      key,
      direction
    });
  };
  // Pagination
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const paginatedData = sortedData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  // Handle filter changes
  const handleFilterChange = (columnId, value) => {
    if (isMultiselectColumn(columnId)) {
      setFilters(prev => ({
        ...prev,
        [columnId]: prev[columnId]?.includes(value) ? prev[columnId].filter(v => v !== value) : [...(prev[columnId] || []), value]
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        [columnId]: value
      }));
    }
    setCurrentPage(1);
  };
  const getStatusBadgeClass = status => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Inactive':
        return 'bg-red-100 text-red-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };
  // Add click outside handler with specific target checking
  useEffect(() => {
    const handleClickOutside = event => {
      const target = event.target as HTMLElement;
      if (openDropdown && !target.closest('.filter-dropdown')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);
  return <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map(column => <th key={column.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort(column.accessor)}>
                <div className="flex items-center space-x-1">
                  <span>{column.Header}</span>
                  <span className="flex flex-col">
                    {sortConfig.key === column.accessor ? sortConfig.direction === 'asc' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" /> : <span className="h-4 w-4"></span>}
                  </span>
                </div>
              </th>)}
          </tr>
          <tr>
            {columns.map(column => <th key={`filter-${column.id}`} className="px-6 py-2">
                {isMultiselectColumn(column.accessor) ? <div className="relative filter-dropdown">
                    <button onClick={() => setOpenDropdown(openDropdown === column.accessor ? null : column.accessor)} className="w-full p-1 text-sm border rounded text-left bg-white text-gray-400">
                      {filters[column.accessor]?.length > 0 ? `${filters[column.accessor].length} selected` : 'Filter...'}
                    </button>
                    {openDropdown === column.accessor && <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-48 overflow-auto">
                        {getUniqueValues(column.accessor).map(value => <div key={value} className="flex items-center px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer" onClick={e => {
                  e.stopPropagation();
                  handleFilterChange(column.accessor, value);
                }}>
                            <input type="checkbox" className="mr-2" checked={filters[column.accessor]?.includes(value) || false} onChange={() => {}} />
                            {value}
                          </div>)}
                      </div>}
                  </div> : <input type="text" placeholder="Filter..." className="w-full p-1 text-sm border rounded" value={filters[column.accessor] || ''} onChange={e => handleFilterChange(column.accessor, e.target.value)} />}
              </th>)}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {paginatedData.length > 0 ? paginatedData.map((row, rowIndex) => <tr key={rowIndex} className="hover:bg-gray-50">
                {columns.map(column => <td key={`${rowIndex}-${column.id}`} className="px-6 py-4 whitespace-nowrap">
                    {column.accessor === 'attestationStatus' ? <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(row[column.accessor])}`}>
                        {row[column.accessor]}
                      </span> : column.accessor === 'otherPracticeStates' ? <span>{row[column.accessor].join(', ')}</span> : row[column.accessor]}
                  </td>)}
              </tr>) : <tr>
              <td colSpan={columns.length} className="px-6 py-4 text-center text-gray-500">
                No results found
              </td>
            </tr>}
        </tbody>
      </table>
      <div className="py-3 flex items-center justify-between border-t border-gray-200 bg-white px-4">
        <div className="flex items-center">
          <p className="text-sm text-gray-700">
            Showing{' '}
            <span className="font-medium">
              {Math.min((currentPage - 1) * rowsPerPage + 1, sortedData.length)}
            </span>{' '}
            -{' '}
            <span className="font-medium">
              {Math.min(currentPage * rowsPerPage, sortedData.length)}
            </span>{' '}
            of <span className="font-medium">{sortedData.length}</span> results
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <select className="border rounded-md p-1 text-sm" value={rowsPerPage} onChange={e => {
          setRowsPerPage(Number(e.target.value));
          setCurrentPage(1);
        }}>
            {[5, 10, 20, 50].map(pageSize => <option key={pageSize} value={pageSize}>
                {pageSize} per page
              </option>)}
          </select>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${currentPage === 1 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'}`}>
              &lt;
            </button>
            <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${currentPage === totalPages ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'}`}>
              &gt;
            </button>
          </nav>
        </div>
      </div>
    </div>;
};