import React, { useEffect, useState, useRef } from 'react';
import { ProviderTable } from './components/ProviderTable';
import { ColumnSelector } from './components/ColumnSelector';
import { TableHeader } from './components/TableHeader';
import { mockData } from './utils/data';
import { searchProvidersWithLLM, generateSummaryWithLLM } from './services/llmService';
import { SqlModal } from './components/SqlModal';
import { generateSql } from './utils/sqlGenerator';
import { Lightbulb, X, Bell, HelpCircle, Settings, Loader2 } from 'lucide-react';
import { CAQHLogo } from './components/CAQHLogo';
import sparklesIcon from './assets/planefinder_whatsnew_sparkles_icon.png';

export function App() {
  const [data] = useState(mockData);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  // Add ref for table to simulate filter clicks
  const tableRef = useRef();

  // Demo suggestions for users
  const demoQuestions = [
    "Show me providers in California with urologist specialty",
    "How many providers have a last attestation date of over one year ago?",
    "Which active providers recently attested?",
    "Find all cardiologists accepting new patients"
  ];

  const [columns, setColumns] = useState([
    { id: 'firstName', header: 'First Name', accessor: 'firstName', width: '140', isVisible: true },
    { id: 'lastName', header: 'Last Name', accessor: 'lastName', width: '140', isVisible: true },
    { id: 'npi', header: 'NPI', accessor: 'npi', width: '120', isVisible: true },
    { id: 'attestationStatus', header: 'Attestation Status', accessor: 'attestationStatus', width: '140', isVisible: true },
    { id: 'attestationDueDate', header: 'Attestation Due Date', accessor: 'attestationDueDate', width: '140', isVisible: true },
    { id: 'lastAttestationDate', header: 'Last Attestation Date', accessor: 'lastAttestationDate', width: '140', isVisible: true },
    { id: 'specialty', header: 'Specialty', accessor: 'specialty', width: '200', isVisible: true },
    { id: 'acceptingPatientStatus', header: 'Accepting New Patients', accessor: 'acceptingPatientStatus', width: '140', isVisible: true },
    { id: 'primaryWorkAddress', header: 'Primary Work Address', accessor: 'primaryWorkAddress', width: '250', isVisible: false },
    { id: 'primaryPracticeState', header: 'Primary Practice State', accessor: 'primaryPracticeState', width: '140', isVisible: true },
    { id: 'otherPracticeStates', header: 'Other Practice States', accessor: 'otherPracticeStates', width: '160', isVisible: false }
  ]);

  const visibleColumns = columns.filter(column => column.isVisible);

  const toggleColumnVisibility = (columnId: string) => {
    setColumns(columns.map(column => 
      column.id === columnId 
        ? { ...column, isVisible: !column.isVisible }
        : column
    ));
  };
  
  const handleSearch = async (query: string) => {
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

  const formatResultCount = (resultCount: number, description: string = '') => {
    const plural = resultCount === 1 ? 'provider' : 'providers';
    return `Found ${resultCount} ${plural} ${description}`;
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
  
  const handleDemoClick = (question: string) => {
    setSearchQuery(question);
    handleSearch(question);
    setShowDemo(false);
  };
  
  const displayData = searchResult?.filteredData || data;
  const currentSql = generateSql(searchQuery, searchResult?.filters || {}, {
    key: null,
    direction: 'asc'
  });
  
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Banner */}
      <header className="w-full bg-white flex items-center px-10 h-16 border-b border-gray-200 sticky top-0 z-50">
        <CAQHLogo className="w-auto h-8 mr-6" />
        <div className="portal-title text-lg font-bold text-blue-900 mr-auto font-['Volte']">
          Provider Directory Portal
        </div>
        <div className="flex items-center space-x-4">
          <Bell className="w-5 h-5 text-gray-600 cursor-pointer" />
          <HelpCircle className="w-5 h-5 text-gray-600 cursor-pointer" />
          <Settings className="w-5 h-5 text-gray-600 cursor-pointer" />
        </div>
      </header>

      {/* Main Content */}
      <div className="px-10 py-8">
        {/* Search Section */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <img src={sparklesIcon} alt="AI" className="w-6 h-6" />
              <h1 className="text-2xl font-bold text-gray-900">Ask anything about your providers</h1>
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Try: 'Show me cardiologists in California' or 'Which providers need to attest soon?'"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  disabled={isSearching}
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center">
                <button
                  onClick={() => handleSearch(searchQuery)}
                  disabled={isSearching || !searchQuery.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
                
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsSqlModalOpen(true)}
                    className="text-gray-600 hover:text-gray-900 text-sm flex items-center gap-1"
                  >
                    <span>SQL</span>
                  </button>
                  
                  <div className="relative">
                    <button
                      onClick={() => setShowDemo(!showDemo)}
                      className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                    >
                      <Lightbulb className="w-4 h-4" />
                      <span>Try examples</span>
                    </button>
                    
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
                </div>
              </div>
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
            isFiltered={!!searchResult}
            onClearFilters={() => {
              setSearchResult(null);
              setSearchQuery('');
              // Clear table filters when using the TableHeader clear button
              if (tableRef.current?.clearAllFilters) {
                tableRef.current.clearAllFilters();
              }
            }}
          />
          
          <div className="flex justify-end p-4 border-b border-gray-200">
            <ColumnSelector 
              columns={columns}
              onToggleColumn={toggleColumnVisibility}
            />
          </div>
          
          <ProviderTable 
            ref={tableRef}
            data={displayData}
            columns={visibleColumns}
            initialSort={searchResult?.sort}
            onFiltersChange={(filters) => {
              // Handle any additional filter change logic if needed
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