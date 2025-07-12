import React, { useEffect, useMemo, useState } from 'react';
import { ChevronUpIcon, ChevronDownIcon, CheckIcon } from 'lucide-react';

// Define multiselect columns
const MULTISELECT_COLUMNS = ['attestationStatus', 'specialty', 'primaryPracticeState', 'otherPracticeStates', 'acceptingPatientStatus'];

export const ProviderTable = ({
  data,
  columns,
  filters,
  onFilterChange,
  initialSort = null,
  onSortChange
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

  useEffect(() => {
    const handleClickOutside = event => {
      if (openDropdown && !event.target.closest('.filter-dropdown')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openDropdown, setOpenDropdown] = useState(null);
  
  // Check if column should use multiselect
  const isMultiselectColumn = columnId => {
    return MULTISELECT_COLUMNS.includes(columnId);
  };
  
  // Get unique values for dropdown filters
  const getUniqueValues = columnId => {
    return [...new Set(data.map(item => item[columnId]))].filter(Boolean);
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

  // Handle sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    const newSortConfig = { key, direction };
    setSortConfig(newSortConfig);
    
    if (onSortChange) {
      onSortChange(newSortConfig);
    }
  };

  // Pagination
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedData = sortedData.slice(startIndex, startIndex + rowsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Handle row clicks (if needed)
  const handleRowClick = (e) => {
    // Implement row click logic if needed
  };

  return (
    <div>
      <table className="updates-table">
        <thead>
          <tr>
            {columns.map(column => (
              <th key={column.id} onClick={() => handleSort(column.accessor)} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{column.header}</span>
                  <div className="sort-icon-container">
                    {sortConfig.key === column.accessor ? (
                      sortConfig.direction === 'asc' ? 
                        <ChevronUpIcon className="sort-icon" /> : 
                        <ChevronDownIcon className="sort-icon" />
                    ) : (
                      <div className="sort-icon-placeholder" />
                    )}
                  </div>
                </div>
              </th>
            ))}
          </tr>
          <tr className="filter-row">
            {columns.map(column => (
              <th key={`filter-${column.id}`} className="filter-cell">
                {isMultiselectColumn(column.accessor) ? (
                  <div className="filter-dropdown">
                    <button 
                      onClick={() => setOpenDropdown(openDropdown === column.accessor ? null : column.accessor)} 
                      className="filter-btn"
                    >
                      {(filters[column.accessor] && filters[column.accessor].length > 0) ? 
                        `${filters[column.accessor].length} selected` : 
                        'Filter...'
                      }
                    </button>
                    {openDropdown === column.accessor && (
                      <div className="filter-popup active">
                        {getUniqueValues(column.accessor).map(value => {
                          return (
                            <div 
                              key={`${column.accessor}-${value}`}
                              className="filter-option" 
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log(`🖱️ Checkbox clicked: ${column.accessor} = ${value}, currently checked: ${filters[column.accessor]?.includes(value) || false}`);
                                onFilterChange(column.accessor, value);
                              }}
                            >
                              <input 
                                type="checkbox" 
                                checked={filters[column.accessor]?.includes(value) || false}
                                readOnly
                              />
                              <span style={{ marginLeft: '8px', cursor: 'pointer' }}>
                                {value}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <input 
                    type="text" 
                    placeholder="Filter..." 
                    className="search-input" 
                    value={filters[column.accessor] || ''} 
                    onChange={(e) => {
                      e.stopPropagation();
                      console.log(`⌨️ Text input changed: ${column.accessor} = ${e.target.value}`);
                      onFilterChange(column.accessor, e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedData.length > 0 ? 
            paginatedData.map((row, rowIndex) => (
              <tr key={rowIndex} className="clickable-row" onClick={handleRowClick}>
                {columns.map(column => (
                  <td key={`${rowIndex}-${column.id}`}>
                    {column.accessor === 'attestationStatus' ?
                      <span className={`status-badge status-${row[column.accessor]?.toLowerCase() || 'default'}`}>
                        {row[column.accessor]}
                      </span>
                      : Array.isArray(row[column.accessor]) ? 
                        row[column.accessor].join(', ') : 
                        row[column.accessor]
                    }
                  </td>
                ))}
              </tr>
            )) : (
              <tr>
                <td colSpan={columns.length} className="no-results">
                  No results found
                </td>
              </tr>
            )
          }
        </tbody>
      </table>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
          <div>
            <label>
              Rows per page: 
              <select value={rowsPerPage} onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>
          <div>
            <button 
              onClick={() => setCurrentPage(currentPage - 1)} 
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span style={{ margin: '0 16px' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(currentPage + 1)} 
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};