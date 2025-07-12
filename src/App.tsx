import React, { useEffect, useState } from 'react';
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

// Define multiselect columns
const MULTISELECT_COLUMNS = ['attestationStatus', 'specialty', 'primaryPracticeState', 'otherPracticeStates', 'acceptingPatientStatus'];

// Helper function to apply filters to data
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
      
      // Handle array filters
      if (Array.isArray(value)) {
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

export function App() {
  const [data] = useState(mockData);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  // CENTRAL FILTER STATE - This is the single source of truth
  const [filters, setFilters] = useState({});
  
  // Track current table sort for SQL generation
  const [currentTableSort, setCurrentTableSort] = useState({ key: null, direction: 'asc' });

  // Demo suggestions for users
  const demoQuestions = [
    "Show me providers in California with urologist specialty",
    "How many providers have a last attestation date of over one year ago?",
    "Which active providers recently attested?",
    "Show pending attestations by specialty",
    "Find inactive providers in Texas"
  ];

  // Columns configuration
  const [columns, setColumns] = useState([
    { id: 'firstName', header: 'First Name', accessor: 'firstName', isVisible: true },
    { id: 'lastName', header: 'Last Name', accessor: 'lastName', isVisible: true },
    { id: 'npi', header: 'NPI', accessor: 'npi', isVisible: true },
    { id: 'attestationStatus', header: 'Status', accessor: 'attestationStatus', isVisible: true },
    { id: 'lastAttestationDate', header: 'Last Attestation', accessor: 'lastAttestationDate', isVisible: true },
    { id: 'specialty', header: 'Specialty', accessor: 'specialty', isVisible: true },
    { id: 'primaryPracticeState', header: 'Primary State', accessor: 'primaryPracticeState', isVisible: true },
    { id: 'otherPracticeStates', header: 'Other States', accessor: 'otherPracticeStates', isVisible: false },
    { id: 'primaryWorkAddress', header: 'Address', accessor: 'primaryWorkAddress', isVisible: false },
    { id: 'acceptingPatientStatus', header: 'Accepting Patients', accessor: 'acceptingPatientStatus', isVisible: false },
  ]);

  const visibleColumns = columns.filter(col => col.isVisible);
  
  // Initialize filters when component mounts
  useEffect(() => {
    const initialFilters = {};
    // Get columns from data keys
    const sampleRow = data[0] || {};
    Object.keys(sampleRow).forEach(key => {
      if (MULTISELECT_COLUMNS.includes(key)) {
        initialFilters[key] = [];
      } else {
        initialFilters[key] = '';
      }
    });
    setFilters(initialFilters);
  }, [data]);

  // CENTRAL FILTER CHANGE HANDLER - Both user clicks and LLM results use this
  const handleFilterChange = (columnId, value) => {
    console.log(`🔧 Filter change: ${columnId} = ${value}`);
    
    if (MULTISELECT_COLUMNS.includes(columnId)) {
      setFilters(prev => {
        const currentValues = prev[columnId] || [];
        const newValues = currentValues.includes(value) ?
          currentValues.filter(item => item !== value) :
          [...currentValues, value];
        
        console.log(`✅ Updated multiselect filter ${columnId}:`, newValues);
        
        return {
          ...prev,
          [columnId]: newValues
        };
      });
    } else {
      setFilters(prev => {
        console.log(`✅ Updated text filter ${columnId}:`, value);
        
        return {
          ...prev,
          [columnId]: value
        };
      });
    }
  };

  // CENTRAL CLEAR FILTERS - Used by both manual clear and search reset
  const clearAllFilters = () => {
    console.log('🧹 Clearing all filters');
    const clearedFilters = {};
    Object.keys(filters).forEach(key => {
      if (MULTISELECT_COLUMNS.includes(key)) {
        clearedFilters[key] = [];
      } else {
        clearedFilters[key] = '';
      }
    });
    setFilters(clearedFilters);
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
      clearAllFilters(); // Use central clear function
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
      
      // STEP 4: Apply filters directly to central state (no more simulation!)
      console.log('🎯 STEP 4: Applying filters to central state...');
      if (result.filters && Object.keys(result.filters).length > 0) {
        // Start with fresh cleared filters structure
        const clearedFilters = {};
        Object.keys(filters).forEach(key => {
          if (MULTISELECT_COLUMNS.includes(key)) {
            clearedFilters[key] = [];
          } else {
            clearedFilters[key] = '';
          }
        });
        
        // Apply only the new LLM filters
        Object.entries(result.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            clearedFilters[key] = value;
          }
        });
        
        setFilters(clearedFilters);
        console.log('✅ STEP 4 COMPLETE: Central filter state updated');
      }
      
      // STEP 5: Calculate filtered data using the filters
      const filteredData = applyFilters(data, result.filters || {});
      console.log('📊 Filtered data count:', filteredData.length);
      
      // STEP 6: Generate natural summary with LLM using actual filtered data
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
      
      setSearchResult(finalResult);
      
      console.log('✅ SEARCH FLOW COMPLETE');
      
    } catch (error) {
      console.error('❌ Search failed:', error);
      setSearchError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    }
  };

  const handleDemoClick = (question) => {
    setSearchQuery(question);
    handleSearch(question);
    setShowDemo(false);
  };

  // Calculate display data using central filter state
  const displayData = searchResult?.filteredData || applyFilters(data, filters);
  
  // Generate SQL that updates with current state
  const currentSql = generateSql(searchQuery, filters, currentTableSort);
  
  // Check if any filters are active
  const isFiltered = searchResult || Object.entries(filters).some(([key, value]) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value && typeof value === 'string' && value.trim().length > 0;
  });

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Banner */}
      <header className="w-full bg-white flex items-center px-10 h-16 border-b border-gray-200 sticky top-0 z-50">
        <CAQHLogo className="w-auto h-8 mr-6" />
        <div className="portal-title text-lg font-bold text-blue-900 mr-auto font-['Volte']">
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
                
                <div className="flex gap-2 relative">
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
            isFiltered={isFiltered}
            onClearFilters={() => {
              setSearchResult(null);
              setSearchQuery('');
              clearAllFilters(); // Use central clear function
            }}
            columns={columns}
            onToggleColumn={toggleColumnVisibility}
            onOpenSqlModal={() => setIsSqlModalOpen(true)}
          />
          
          <ProviderTable 
            data={data}
            columns={visibleColumns}
            filters={filters}
            onFilterChange={handleFilterChange}
            initialSort={searchResult?.sort}
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
        sql={currentSql}
      />
    </div>
  );
}