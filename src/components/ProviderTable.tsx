import React, { useEffect, useMemo, useState, useImperativeHandle, forwardRef } from 'react';
import { ChevronUpIcon, ChevronDownIcon, CheckIcon } from 'lucide-react';

export const ProviderTable = forwardRef(({
  data,
  columns,
  initialSort = null,
  onFiltersChange
}, ref) => {
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
  
  // Handle filter changes
  const handleFilterChange = (columnId, value) => {
    if (isMultiselectColumn(columnId)) {
      setFilters(prev => ({
        ...prev,
        [columnId]: prev[columnId]?.includes(value) ?
          prev[columnId].filter(item => item !== value) :
          [...(prev[columnId] || []), value]
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        [columnId]: value
      }));
    }
  };

  // Expose handleFilterChange via ref
  useImperativeHandle(ref, () => ({
    handleFilterChange
  }));
  
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
    return ['attestationStatus', 'specialty', 'primaryPracticeState', 'otherPracticeStates', 'acceptingPatientStatus'].includes(columnId);
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
        return 'status-active';
      case 'Inactive':
        return 'status-inactive';
      case 'Pending':
        return 'status-pending';
      case 'Expired':
        return 'status-expired';
      default:
        return 'status-default';
    }
  };

  const getAcceptingPatientsBadgeClass = status => {
    switch (status) {
      case 'Yes':
        return 'status-active';
      case 'No':
        return 'status-inactive';
      case 'Limited':
        return 'status-pending';
      default:
        return 'status-default';
    }
  };
  // Handle row click to redirect to Figma prototype
  const handleRowClick = () => {
    // Open in full screen mode with maximized window
    const newWindow = window.open(
      'https://www.figma.com/proto/TeN9UnvECKHgym7vRT91Jo/Final-CAQH-PSV-Prototype?node-id=0-6&p=f&t=4IyqYz4va6VHvv4r-1&scaling=scale-down-width&content-scaling=fixed&page-id=0%3A1',
      '_blank',
      'fullscreen=yes,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no'
    );
    
    // Try to maximize the window if fullscreen isn't supported
    if (newWindow) {
      newWindow.focus();
      // Attempt to maximize on browsers that support it
      try {
        newWindow.moveTo(0, 0);
        newWindow.resizeTo(screen.width, screen.height);
      } catch (e) {
        // Silently fail if browser doesn't allow window manipulation
      }
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
  return <div className="updates-table-wrapper">
      <table className="updates-table">
        <thead>
          <tr>
            {columns.map(column => <th key={column.id} className="sortable" onClick={() => requestSort(column.accessor)}>
                <div className="th-content">
                  <span>{column.Header}</span>
                  <span className="sort-icon-container">
                    {sortConfig.key === column.accessor ? sortConfig.direction === 'asc' ? <ChevronUpIcon className="sort-icon" /> : <ChevronDownIcon className="sort-icon" /> : <div className="sort-icon-placeholder"></div>}
                  </span>
                </div>
              </th>)}
          </tr>
          <tr className="filter-row">
            {columns.map(column => <th key={`filter-${column.id}`} className="filter-cell">
                {isMultiselectColumn(column.accessor) ? <div className="filter-dropdown">
                    <button onClick={() => setOpenDropdown(openDropdown === column.accessor ? null : column.accessor)} className="filter-btn">
                      {filters[column.accessor]?.length > 0 ? `${filters[column.accessor].length} selected` : 'Filter...'}
                    </button>
                    {openDropdown === column.accessor && <div className="filter-popup active">
                        {getUniqueValues(column.accessor).map(value => <div key={value} className="filter-option" onClick={e => {
                  e.stopPropagation();
                  handleFilterChange(column.accessor, value);
                }}>
                            <input type="checkbox" checked={filters[column.accessor]?.includes(value) || false} onChange={() => {}} />
                            {value}
                          </div>)}
                      </div>}
                  </div> : <input type="text" placeholder="Filter..." className="search-input" value={filters[column.accessor] || ''} onChange={e => handleFilterChange(column.accessor, e.target.value)} />}
              </th>)}
          </tr>
        </thead>
        <tbody>
          {paginatedData.length > 0 ? paginatedData.map((row, rowIndex) => <tr key={rowIndex} className="clickable-row" onClick={handleRowClick}>
                {columns.map(column => <td key={`${rowIndex}-${column.id}`}>
                    {column.accessor === 'attestationStatus' ? <span className={`status-badge ${getStatusBadgeClass(row[column.accessor])}`}>
                        {row[column.accessor]}
                      </span> : column.accessor === 'acceptingPatientStatus' ? <span className={`status-badge ${getAcceptingPatientsBadgeClass(row[column.accessor])}`}>
                        {row[column.accessor]}
                      </span> : column.accessor === 'otherPracticeStates' ? <span>{row[column.accessor].join(', ')}</span> : column.accessor === 'primaryWorkAddress' ? <span className="address-text">{row[column.accessor]}</span> : row[column.accessor]}
                  </td>)}
              </tr>) : <tr>
              <td colSpan={columns.length} className="no-results">
                No results found
              </td>
            </tr>}
        </tbody>
      </table>
      <div className="table-pagination">
        <div className="pagination-info">
          <p>
            Showing{' '}
            <span className="pagination-numbers">
              {Math.min((currentPage - 1) * rowsPerPage + 1, sortedData.length)}
            </span>{' '}
            -{' '}
            <span className="pagination-numbers">
              {Math.min(currentPage * rowsPerPage, sortedData.length)}
            </span>{' '}
            of <span className="pagination-numbers">{sortedData.length}</span> results
          </p>
        </div>
        <div className="pagination-controls">
          <select className="pagination-select" value={rowsPerPage} onChange={e => {
          setRowsPerPage(Number(e.target.value));
          setCurrentPage(1);
        }}>
            {[5, 10, 20, 50].map(pageSize => <option key={pageSize} value={pageSize}>
                {pageSize} per page
              </option>)}
          </select>
          <div className="pagination-buttons">
            <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className={`pagination-btn ${currentPage === 1 ? 'disabled' : ''}`}>
              &lt;
            </button>
            <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className={`pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`}>
              &gt;
            </button>
          </div>
        </div>
      </div>
    </div>;
});