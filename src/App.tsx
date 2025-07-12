import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ProviderTable } from './components/ProviderTable';
import { ColumnSelector } from './components/ColumnSelector';
import { SqlModal } from './components/SqlModal';
import { generateSql, hasActiveFilters } from './utils/sqlGenerator';
import { searchProvidersWithLLM, generateSummaryWithLLM } from './services/llmService';
import { mockData } from './utils/data';
import { Search, Database, X } from 'lucide-react';
import './App.css';

// Mock data - replace with your actual data
const mockDataFallback = [
  {
    firstName: 'John',
    lastName: 'Smith',
    npi: '1234567890',
    attestationStatus: 'Active',
    lastAttestationDate: '2023-05-15',
    specialty: 'Cardiology',
    primaryPracticeState: 'CA',
    otherPracticeStates: ['NY', 'NJ'],
    acceptingPatientStatus: 'Yes',
    primaryWorkAddress: '1200 Health Dr, San Francisco CA 94102'
  }
];

// Column configuration
const allColumns = [
  { id: 'firstName', Header: 'First Name', accessor: 'firstName', isVisible: true },
  { id: 'lastName', Header: 'Last Name', accessor: 'lastName', isVisible: true },
  { id: 'npi', Header: 'NPI', accessor: 'npi', isVisible: true },
  { id: 'attestationStatus', Header: 'Status', accessor: 'attestationStatus', isVisible: true },
  { id: 'lastAttestationDate', Header: 'Last Attestation', accessor: 'lastAttestationDate', isVisible: true },
  { id: 'specialty', Header: 'Specialty', accessor: 'specialty', isVisible: true },
  { id: 'primaryPracticeState', Header: 'Primary State', accessor: 'primaryPracticeState', isVisible: true },
  { id: 'otherPracticeStates', Header: 'Other States', accessor: 'otherPracticeStates', isVisible: false },
  { id: 'acceptingPatientStatus', Header: 'Accepting Patients', accessor: 'acceptingPatientStatus', isVisible: false },
  { id: 'primaryWorkAddress', Header: 'Address', accessor: 'primaryWorkAddress', isVisible: false }
];

function App() {
  const [data] = useState(mockData || mockDataFallback);
  const [columns, setColumns] = useState(allColumns);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [showDemo, setShowDemo] = useState(true);
  const [showSqlModal, setShowSqlModal] = useState(false);
  
  // CENTRALIZED FILTER STATE - Single source of truth
  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Check if column should use multiselect
  const isMultiselectColumn = (columnId) => {
    return ['attestationStatus', 'specialty', 'primaryPracticeState', 'otherPracticeStates', 'acceptingPatientStatus'].includes(columnId);
  };

  // Initialize filters when columns change
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
  }, [columns]);

  // CENTRALIZED FILTER CHANGE HANDLER - Used by both manual and programmatic changes
  const handleFilterChange = (columnId, value) => {
    console.log(`🔧 Filter change: ${columnId} = ${value}`);
    
    if (isMultiselectColumn(columnId)) {
      setFilters(prev => {
        const currentValues = prev[columnId] || [];
        const newValues = currentValues.includes(value) ?
          currentValues.filter(item => item !== value) :
          [...currentValues, value];
        
        const newFilters = {
          ...prev,
          [columnId]: newValues
        };
        
        console.log(`✅ Updated multiselect filter ${columnId}:`, newValues);
        return newFilters;
      });
    } else {
      setFilters(prev => {
        const newFilters = {
          ...prev,
          [columnId]: value
        };
        
        console.log(`✅ Updated text filter ${columnId}:`, value);
        return newFilters;
      });
    }
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
  };

  // Handle sort changes
  const handleSortChange = (newSortConfig) => {
    setSortConfig(newSortConfig);
  };

  const toggleColumnVisibility = (columnId) => {
    setColumns(columns.map(column => 
      column.id === columnId 
        ? { ...column, isVisible: !column.isVisible }
        : column
    ));
  };
  
  const handleSearch = async (query) => {
    console.log('🎬 SEARCH FLOW STARTED');
    console.log('=' .repeat(50));
    console.log('📝 User Query:', query);
    
    setSearchError('');
    
    if (!query.trim()) {
      console.log('❌ Empty query, clearing results');
      setSearchResult(null);
      clearAllFilters();
      return;
    }

    setIsSearching(true);
    
    try {
      // Clear existing filters before new search
      console.log('🧹 Clearing existing filters...');
      clearAllFilters();
      
      // STEP 1-3: Get filters from LLM
      console.log('🎯 STEP 1-3: Requesting filters from LLM...');
      const result = await searchProvidersWithLLM(query, data);
      
      console.log('✅ STEP 3 COMPLETE: Filters received from LLM');
      console.log('🔍 Filters to apply:', result.filters);
      
      // STEP 4: Apply filters to get actual filtered data
      console.log('🎯 STEP 4: Applying filters to data...');
      console.log('📊 Original data count:', data.length);
      
      const filteredData = applyFilters(data, result.filters);
      
      console.log('✅ STEP 4 COMPLETE: Data filtered');
      console.log('📊 Filtered data count:', filteredData.length);
      console.log('📋 Sample filtered data:', filteredData.slice(0, 2));
      
      // STEP 5-6: Generate natural summary with LLM using actual filtered data
      console.log('🎯 STEP 5-6: Generating summary...');
      const naturalSummary = await generateSummaryWithLLM(query, filteredData, data.length);
      
      console.log('✅ STEP 6 COMPLETE: Summary generated');
      console.log('📝 Final summary:', naturalSummary);
      
      // STEP 7: Update UI state
      console.log('🎯 STEP 7: Updating UI state...');
      const finalResult = {
        ...result,
        filteredData,
        summary: naturalSummary
      };
      
      console.log('📦 Final search result:', {
        filtersApplied: Object.keys(result.filters).length > 0,
        dataCount: filteredData.length,
        summary: naturalSummary,
        relevantColumns: result.relevantColumns
      });
      
      setSearchResult(finalResult);
      
      // STEP 8: Apply filters to centralized state (this will update the UI automatically)
      if (result.filters && Object.keys(result.filters).length > 0) {
        console.log('🎯 STEP 8: Applying filters to centralized state...');
        
        // Apply all filters at once to avoid multiple re-renders
        const newFilters = { ...filters };
        
        Object.entries(result.filters).forEach(([filterKey, filterValues]) => {
          console.log(`🖱️ Applying filter: ${filterKey} = ${filterValues}`);
          
          if (Array.isArray(filterValues)) {
            // For multiselect filters, set the entire array
            newFilters[filterKey] = filterValues;
            console.log(`  ✅ Set multiselect filter ${filterKey}:`, filterValues);
          } else if (filterValues && typeof filterValues === 'string') {
            // Handle special date formats and regular strings
            let processedValue = filterValues;
            if (filterValues.startsWith('<') || filterValues.startsWith('>')) {
              // For date filters, strip the operator for display
              processedValue = filterValues.substring(1);
            }
            newFilters[filterKey] = processedValue;
            console.log(`  ✅ Set text filter ${filterKey}:`, processedValue);
          }
        });
        
        // Apply all filters in one state update
        setFilters(newFilters);
        console.log('✅ STEP 8 COMPLETE: Filters applied to centralized state');
      }
      
      console.log('✅ STEP 7 COMPLETE: UI updated');
      console.log('🎬 SEARCH FLOW COMPLETED SUCCESSFULLY');
      console.log('=' .repeat(50));
      
    } catch (error) {
      console.error('❌ SEARCH FLOW FAILED');
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      console.log('=' .repeat(50));
      
      setSearchError('Failed to process your search. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const formatResultCount = (resultCount, description = '') => {
    const plural = resultCount === 1 ? 'provider' : 'providers';
    return `Found ${resultCount} ${plural} ${description}`;
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    }
  };
  
  // Apply filters function with detailed logging
  const applyFilters = (data, filters) => {
    console.log('🔧 APPLY FILTERS: Starting filter application');
    console.log('📊 Input data count:', data.length);
    console.log('🔍 Filters to apply:', filters);
    
    if (!filters || Object.keys(filters).length === 0) {
      console.log('⚠️  No filters provided, returning all data');
      return data;
    }
    
    const result = data.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value || (Array.isArray(value) && value.length === 0)) {
          return true;
        }
        
        // Handle date range filters
        if (key === 'lastAttestationDate' && typeof value === 'string') {
          const itemDate = new Date(item[key]);
          if (value.startsWith('<')) {
            const compareDate = new Date(value.substring(1));
            const matches = itemDate < compareDate;
            console.log(`📅 Date filter ${key}: ${item[key]} < ${value.substring(1)} = ${matches}`);
            return matches;
          } else if (value.startsWith('>')) {
            const compareDate = new Date(value.substring(1));
            const matches = itemDate > compareDate;
            console.log(`📅 Date filter ${key}: ${item[key]} > ${value.substring(1)} = ${matches}`);
            return matches;
          }
          return item[key] === value;
        }
        
        if (Array.isArray(value)) {
          // Handle array filters
          if (key === 'otherPracticeStates' && Array.isArray(item[key])) {
            const matches = item[key].some(state => value.includes(state));
            console.log(`🔍 Array filter ${key}: ${item[key]} intersects ${value} = ${matches}`);
            return matches;
          }
          const matches = value.includes(item[key]);
          console.log(`🔍 Array filter ${key}: ${item[key]} in ${value} = ${matches}`);
          return matches;
        }
        
        if (typeof value === 'string') {
          // Handle string filters (like names, NPI)
          const matches = item[key]?.toString().toLowerCase().includes(value.toLowerCase());
          console.log(`🔍 String filter ${key}: "${item[key]}" contains "${value}" = ${matches}`);
          return matches;
        }
        
        const matches = item[key] === value;
        console.log(`🔍 Exact filter ${key}: ${item[key]} === ${value} = ${matches}`);
        return matches;
      });
    });
    
    console.log('✅ APPLY FILTERS: Complete');
    console.log('📊 Output data count:', result.length);
    
    return result;
  };
  
  const handleDemoClick = (question) => {
    setSearchQuery(question);
    handleSearch(question);
    setShowDemo(false);
  };
  
  // Use filtered data based on current filter state
  const displayData = useMemo(() => {
    console.log('🔄 Recalculating displayData with filters:', filters);
    const result = applyFilters(data, filters);
    console.log('📊 DisplayData result count:', result.length);
    return result;
  }, [data, filters]);
  
  // Generate SQL that updates with current state
  const currentSql = generateSql(searchQuery, filters, sortConfig);
  const showSqlButton = hasActiveFilters(searchQuery, filters, sortConfig);

  const visibleColumns = columns.filter(col => col.isVisible);

  return (
    <div className="App">
      <div className="main-container">
        <header className="app-header">
          <div className="header-content">
            <h1 className="app-title">Provider Search</h1>
            <p className="app-subtitle">Search and filter healthcare providers using natural language</p>
          </div>
        </header>

        <div className="search-section">
          <div className="search-container">
            <div className="search-input-wrapper">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Ask about providers... (e.g., 'Show me active cardiologists in California')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="search-input"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResult(null);
                    clearAllFilters();
                  }}
                  className="clear-search-btn"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => handleSearch(searchQuery)}
              disabled={isSearching || !searchQuery.trim()}
              className="search-btn"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {searchError && (
            <div className="error-message">
              {searchError}
            </div>
          )}

          {searchResult && (
            <div className="search-results">
              <div className="results-summary">
                {formatResultCount(displayData.length, searchResult.summary || '')}
              </div>
            </div>
          )}
        </div>

        <div className="controls-section">
          <ColumnSelector 
            columns={columns}
            toggleColumnVisibility={toggleColumnVisibility}
          />
          
          {showSqlButton && (
            <button
              onClick={() => setShowSqlModal(true)}
              className="sql-btn"
            >
              <Database className="w-4 h-4 mr-2" />
              View SQL
            </button>
          )}
        </div>

        <div className="table-section">
          <ProviderTable
            data={data}
            displayData={displayData}
            columns={visibleColumns}
            filters={filters}
            sortConfig={sortConfig}
            onFilterChange={handleFilterChange}
            onSortChange={handleSortChange}
            onFiltersChange={(filters) => {
              // This callback is used for SQL generation tracking
              console.log('📊 Filters changed for SQL generation:', filters);
            }}
          />
        </div>

        {showDemo && (
          <div className="demo-overlay">
            <div className="demo-card">
              <h3>Try these example searches:</h3>
              <div className="demo-questions">
                <button onClick={() => handleDemoClick("Show me active cardiologists")}>
                  Show me active cardiologists
                </button>
                <button onClick={() => handleDemoClick("Providers in California")}>
                  Providers in California
                </button>
                <button onClick={() => handleDemoClick("Who hasn't attested in over a year?")}>
                  Who hasn't attested in over a year?
                </button>
                <button onClick={() => handleDemoClick("Inactive providers accepting patients")}>
                  Inactive providers accepting patients
                </button>
              </div>
              <button onClick={() => setShowDemo(false)} className="demo-close">
                Skip demo
              </button>
            </div>
          </div>
        )}

        <SqlModal
          isOpen={showSqlModal}
          onClose={() => setShowSqlModal(false)}
          sql={currentSql}
        />
      </div>
    </div>
  );
}

export default App;