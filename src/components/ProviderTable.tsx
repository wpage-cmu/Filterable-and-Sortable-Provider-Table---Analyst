import React, { useEffect, useMemo, useState, useImperativeHandle, forwardRef } from 'react';
import { ChevronUpIcon, ChevronDownIcon, CheckIcon } from 'lucide-react';

export const ProviderTable = forwardRef(({
  data,
  columns,
  initialSort = null,
  onFiltersChange,
  onSortChange
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
  
  // Add a re-render trigger to force checkbox updates
  const [renderKey, setRenderKey] = useState(0);
  
  // Check if column should use multiselect
  const isMultiselectColumn = columnId => {
    return ['attestationStatus', 'specialty', 'primaryPracticeState', 'otherPracticeStates', 'acceptingPatientStatus'].includes(columnId);
  };
  
  // Move filter initialization to useEffect
  useEffect(() => {
    const initialFilters = {};
    columns.forEach(column => {
      if (isMultiselectColumn(column.accessor)) {
        initialFilters[column.accessor] = [];
      } else {
        initialFilters[column.accessor] = '';
      }
    });
    setFilters(initialFilters);
  }, [columns]); // Depend on columns to reinitialize when columns change
  
  // Handle filter changes - THE FIX IS HERE
  const handleFilterChange = (columnId, value) => {
    console.log(`🔧 Filter change: ${columnId} = ${value}`);
    
    if (isMultiselectColumn(columnId)) {
      setFilters(prev => {
        const currentValues = prev[columnId] || [];
        const newValues = currentValues.includes(value) ?
          currentValues.filter(item => item !== value) :
          [...currentValues, value];
        
        console.log(`✅ Updated multiselect filter ${columnId}:`, newValues);
        
        // Force re-render by updating the render key
        setRenderKey(k => k + 1);
        
        return {
          ...prev,
          [columnId]: newValues
        };
      });
    } else {
      setFilters(prev => {
        console.log(`✅ Updated text filter ${columnId}:`, value);
        
        // Force re-render by updating the render key
        setRenderKey(k => k + 1);
        
        return {
          ...prev,
          [columnId]: value
        };
      });
    }
    // Reset to first page when filters change
    setCurrentPage(1);
  };

  // Clear all filters function
  const clearAllFilters = () => {
    console.log('🧹 Clearing all filters');
    const initialFilters = {};
    columns.forEach(column => {
      if (isMultiselectColumn(column.accessor)) {
        initialFilters[column.accessor] = [];
      } else {
        initialFilters[column.accessor] = '';
      }
    });
    setFilters(initialFilters);
    setCurrentPage(1);
    setRenderKey(k => k + 1); // Force re-render
  };

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    handleFilterChange,
    clearAllFilters
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
  
  // Pagination logic
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedData = sortedData.slice(startIndex, endIndex);
  
  // Handle sort
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    if (onSortChange) {
      onSortChange({ key, direction });
    }
  };
  
  // Handle row click for opening in new tab
  const handleRowClick = () => {
    try {
      const newTab = window.open('about:blank', '_blank');
      if (newTab) {
        newTab.document.write('<html><body><h1>Provider Details</h1><p>Provider details would be shown here.</p></body></html>');
        newTab.document.close();
      }
    } catch (e) {
      // Silently fail if browser doesn't allow window manipulation
    }
  };

  // Add click outside handler with specific target checking
  useEffect(() => {
    const handleClickOutside = event => {
      const target = event.target;
      if (openDropdown && !target.closest('.filter-dropdown')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);
  
  return (
    <div className="updates-table-wrapper">
      <table className="updates-table">
        <thead>
          <tr>
            {columns.map(column => (
              <th key={column.id} className="sortable" onClick={() => requestSort(column.accessor)}>
                <div className="th-content">
                  <span>{column.Header}</span>
                  <span className="sort-icon-container">
                    {sortConfig.key === column.accessor ? 
                      sortConfig.direction === 'asc' ? 
                        <ChevronUpIcon className="sort-icon" /> : 
                        <ChevronDownIcon className="sort-icon" /> : 
                      <div className="sort-icon-placeholder"></div>
                    }
                  </span>
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
                          const isChecked = filters[column.accessor]?.includes(value) || false;
                          return (
                            <div 
                              key={`${column.accessor}-${value}-${renderKey}`}
                              className="filter-option" 
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log(`🖱️ Checkbox clicked: ${column.accessor} = ${value}, currently checked: ${isChecked}`);
                                handleFilterChange(column.accessor, value);
                              }}
                            >
                              <input 
                                type="checkbox" 
                                checked={isChecked}
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
                      handleFilterChange(column.accessor, e.target.value);
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
                    {column.accessor === 'attestationStatus' ? (
                      <span className={`status-badge ${getStatusBadgeClass(row[column.accessor])}`}>
                        {row[column.accessor]}
                      </span>
                    ) : column.accessor === 'acceptingPatientStatus' ? (
                      <span className={`status-badge ${getAcceptingPatientsBadgeClass(row[column.accessor])}`}>
                        {row[column.accessor]}
                      </span>
                    ) : Array.isArray(row[column.accessor]) ? (
                      row[column.accessor].join(', ')
                    ) : (
                      row[column.accessor]
                    )}
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
      
      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="pagination-controls">
          <div className="pagination-info">
            Showing {startIndex + 1}-{Math.min(endIndex, sortedData.length)} of {sortedData.length} results
          </div>
          <div className="pagination-buttons">
            <button 
              onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              Previous
            </button>
            <span className="page-info">
              Page {currentPage} of {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
  
  // Helper functions for badge classes
  function getStatusBadgeClass(status) {
    switch (status?.toLowerCase()) {
      case 'active': return 'status-active';
      case 'inactive': return 'status-inactive';
      case 'pending': return 'status-pending';
      case 'expired': return 'status-expired';
      default: return 'status-default';
    }
  }
  
  function getAcceptingPatientsBadgeClass(status) {
    switch (status?.toLowerCase()) {
      case 'yes': return 'status-active';
      case 'no': return 'status-inactive';
      case 'limited': return 'status-pending';
      default: return 'status-default';
    }
  }
});