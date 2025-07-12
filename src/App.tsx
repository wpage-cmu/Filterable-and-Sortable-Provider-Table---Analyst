import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ProviderTable } from './components/ProviderTable';
import { ColumnSelector } from './components/ColumnSelector';
import { TableHeader } from './components/TableHeader';
import { SqlModal } from './components/SqlModal';
import { generateSql, hasActiveFilters } from './utils/sqlGenerator';
import { searchProvidersWithLLM, generateSummaryWithLLM } from './services/llmService';
import { mockData } from './utils/data';
import { Search, Database, X, Lightbulb, Bell, HelpCircle, Settings, Loader2 } from 'lucide-react';
import { CAQHLogo } from './components/CAQHLogo';
import sparklesIcon from './assets/planefinder_whatsnew_sparkles_icon.png';

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

export function App() {
  const [data] = useState(mockData);
  const [columns, setColumns] = useState(allColumns);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  // CENTRALIZED FILTER STATE - Single source of truth
  const [currentTableFilters, setCurrentTableFilters] = useState({});
  const [currentTableSort, setCurrentTableSort] = useState({ key: null, direction: 'asc' });
  
  // Add ref for table to simulate filter clicks (keeping for backward compatibility)
  const tableRef = useRef();

  // Demo suggestions for users
  const demoQuestions = [
    "Show me providers in California with urologist specialty",
    "How many providers have a last attestation date of over one year ago?",
    "Which active providers recently attested?",
    "Find all active cardiologists",
    "Show inactive providers accepting patients"
  ];

  // Check if column should use multiselect
  const isMultiselectColumn = (columnId) => {
    return ['attestationStatus', 'specialty', 'primaryPracticeState', 'otherPracticeStates', 'acceptingPatientStatus'].includes(columnId);
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
      // Clear table filters when search is cleared
      if (tableRef.current?.clearAllFilters) {
        tableRef.current.clearAllFilters();
      }
      return;
    }

    setIsSearching(true);
    
    try {
      // Clear existing table filters before new search
      console.log('🧹 Clearing existing table filters...');
      if (tableRef.current?.clearAllFilters) {
        tableRef.current.clearAllFilters();
      }
      
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
      
      // STEP 8: Simulate clicking the filters that LLM returned
      if (result.filters && Object.keys(result.filters).length > 0) {
        console.log('🎯 STEP 8: Simulating filter clicks in UI...');
        
        // Small delay to ensure the table has rendered
        setTimeout(() => {
          Object.entries(result.filters).forEach(([filterKey, filterValues]) => {
            console.log(`🖱️ Simulating filter clicks for ${filterKey}:`, filterValues);
            
            if (Array.isArray(filterValues)) {
              filterValues.forEach(value => {
                console.log(`  ✅ Clicking filter: ${filterKey} = ${value}`);
                tableRef.current?.handleFilterChange(filterKey, value);
              });
            } else if (filterValues && typeof filterValues === 'string') {
              // Handle special date formats and regular strings
              let processedValue = filterValues;
              if (filterValues.startsWith('<') || filterValues.startsWith('>')) {
                // For date filters, strip the operator for display
                processedValue = filterValues.substring(1);
              }
              console.log(`  ✅ Setting filter: ${filterKey} = ${processedValue}`);
              tableRef.current?.handleFilterChange(filterKey, processedValue);
            }
          });
          
          console.log('✅ STEP 8 COMPLETE: Filter UI updated');
        }, 100);
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
  
  const displayData = searchResult?.filteredData || data;
  
  // Generate SQL that updates with current state
  const currentSql = generateSql(searchQuery, currentTableFilters, currentTableSort);
  const showSqlButton = hasActiveFilters(searchQuery, currentTableFilters, currentTableSort);

  const visibleColumns = columns.filter(col => col.isVisible);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <CAQHLogo />
              <div className="h-8 w-px bg-gray-300"></div>
              <h1 className="text-2xl font-bold text-gray-900">Provider Search</h1>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Bell className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <HelpCircle className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Natural Language Search</h2>
              <p className="text-gray-600">Ask questions about providers in plain English</p>
            </div>
            
            <div className="flex gap-4 items-end relative">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Ask about providers... (e.g., 'Show me active cardiologists in California')"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResult(null);
                        if (tableRef.current?.clearAllFilters) {
                          tableRef.current.clearAllFilters();
                        }
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => handleSearch(searchQuery)}
                disabled={isSearching || !searchQuery.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSearching && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSearching ? 'Searching...' : 'Search'}
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDemo(!showDemo)}
                  className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                >
                  <Lightbulb className="w-4 h-4" />
                  <span>Try examples</span>
                </button>
              </div>
                  
              {showDemo && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <div className="p-3 border-b border-gray-200 flex justify-between items-center">
                    <span className="font-medium text-gray-900">Example Questions</span>
                    <button
                      onClick={() => setShowDemo(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-2">
                    {demoQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => handleDemoClick(question)}
                        className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm text-gray-700 hover:text-gray-900"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Search Error */}
            {searchError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{searchError}</p>
              </div>
            )}

            {/* Search Results Summary */}
            {searchResult && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <img src={sparklesIcon} alt="AI" className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-green-800 font-medium mb-1">Search Results</p>
                    <p className="text-green-700">{searchResult.summary}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <TableHeader 
            resultCount={displayData.length}
            totalCount={data.length}
            isFiltered={!searchResult}
            onClearFilters={() => {
              setSearchResult(null);
              setSearchQuery('');
              // Clear table filters when using the TableHeader clear button
              if (tableRef.current?.clearAllFilters) {
                tableRef.current.clearAllFilters();
              }
            }}
            columns={columns}
            onToggleColumn={toggleColumnVisibility}
            onOpenSqlModal={() => setIsSqlModalOpen(true)}
          />
          
          <ProviderTable 
            ref={tableRef}
            data={displayData}
            columns={visibleColumns}
            initialSort={searchResult?.sort}
            onFiltersChange={(filters) => {
              setCurrentTableFilters(filters);
            }}
            onSortChange={(sortConfig) => {
              setCurrentTableSort(sortConfig);
            }}
          />
        </div>
      </div>

      {/* SQL Modal */}
      <SqlModal 
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
        sqlQuery={currentSql}
      />
    </div>
  );
}