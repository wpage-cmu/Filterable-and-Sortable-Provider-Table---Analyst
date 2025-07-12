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

export function App() {
  const [data] = useState(mockData);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Demo suggestions for users
  const demoQuestions = [
    "Show me providers in California with urologist specialty",
    "How many providers have a last attestation date of over one year ago?",
    "Which active providers recently attested?",
    "Find all cardiologists in New York"
  ];

  // Modified allColumns with new order and new columns
  const allColumns = [{
    id: 'npi',
    Header: 'NPI',
    accessor: 'npi',
    isVisible: true,
    isAlwaysVisible: true
  }, {
    id: 'firstName',
    Header: 'Provider First Name',
    accessor: 'firstName',
    isVisible: true,
    isAlwaysVisible: true
  }, {
    id: 'lastName',
    Header: 'Provider Last Name',
    accessor: 'lastName',
    isVisible: true,
    isAlwaysVisible: true
  }, {
    id: 'attestationStatus',
    Header: 'Attestation Status',
    accessor: 'attestationStatus',
    isVisible: false,
    isAlwaysVisible: false
  }, {
    id: 'attestationDueDate',
    Header: 'Attestation Due Date',
    accessor: 'attestationDueDate',
    isVisible: false,
    isAlwaysVisible: false
  }, {
    id: 'lastAttestationDate',
    Header: 'Last Attestation Date',
    accessor: 'lastAttestationDate',
    isVisible: false,
    isAlwaysVisible: false
  }, {
    id: 'specialty',
    Header: 'Specialty',
    accessor: 'specialty',
    isVisible: false,
    isAlwaysVisible: false
  }, {
    id: 'acceptingPatientStatus',
    Header: 'Accepting Patient Status',
    accessor: 'acceptingPatientStatus',
    isVisible: false,
    isAlwaysVisible: false
  }, {
    id: 'primaryWorkAddress',
    Header: 'Primary Work Address',
    accessor: 'primaryWorkAddress',
    isVisible: false,
    isAlwaysVisible: false
  }, {
    id: 'primaryPracticeState',
    Header: 'Primary Practice State',
    accessor: 'primaryPracticeState',
    isVisible: false,
    isAlwaysVisible: false
  }, {
    id: 'otherPracticeStates',
    Header: 'Other Practice State(s)',
    accessor: 'otherPracticeStates',
    isVisible: false,
    isAlwaysVisible: false
  }];
  const [visibleColumns, setVisibleColumns] = useState(allColumns);
  
  // Update column visibility based on search results
  useEffect(() => {
    if (searchResult && searchResult.relevantColumns) {
      setVisibleColumns(visibleColumns.map(column => ({
        ...column,
        isVisible: column.isAlwaysVisible || searchResult.relevantColumns?.includes(column.accessor) || false
      })));
    }
  }, [searchResult]);
  
  const toggleColumnVisibility = columnId => {
    setVisibleColumns(visibleColumns.map(column => column.id === columnId ? {
      ...column,
      isVisible: !column.isVisible
    } : column));
  };
  
  // Add this to your App.tsx handleSearch function
  const handleSearch = async (query: string) => {
    console.log('🎬 SEARCH FLOW STARTED');
    console.log('=' .repeat(50));
    console.log('📝 User Query:', query);
    
    setSearchError('');
    
    if (!query.trim()) {
      console.log('❌ Empty query, clearing results');
      setSearchResult(null);
      return;
    }

    setIsSearching(true);
    
    try {
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
      setSearchResult(null);
    } finally {
      setIsSearching(false);
    }
  };

  // Generate accurate summary with real counts
  const generateAccurateSummary = (query: string, filters: any, resultCount: number, totalCount: number): string => {
    if (resultCount === totalCount) {
      return `Showing all ${totalCount} providers`;
    }

    // Build description based on filters
    const filterDescriptions: string[] = [];
    
    if (filters.specialty?.length) {
      const specialties = filters.specialty.join(', ');
      filterDescriptions.push(`${specialties.toLowerCase()}`);
    }
    
    if (filters.attestationStatus?.length) {
      const statuses = filters.attestationStatus.join(', ').toLowerCase();
      filterDescriptions.push(`with ${statuses} status`);
    }
    
    if (filters.primaryPracticeState?.length) {
      const states = filters.primaryPracticeState.join(', ');
      filterDescriptions.push(`in ${states}`);
    }
    
    if (filters.lastAttestationDate) {
      if (filters.lastAttestationDate.startsWith('<')) {
        const date = filters.lastAttestationDate.substring(1);
        filterDescriptions.push(`who last attested before ${date}`);
      } else if (filters.lastAttestationDate.startsWith('>')) {
        const date = filters.lastAttestationDate.substring(1);
        filterDescriptions.push(`who attested after ${date}`);
      }
    }

    let description = filterDescriptions.join(' ');
    if (!description) {
      description = 'matching your search';
    }

    const plural = resultCount === 1 ? 'provider' : 'providers';
    return `Found ${resultCount} ${plural} ${description}`;
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    }
  };
  
  // Also add detailed logging to applyFilters
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
  
  return <div className="min-h-screen bg-gray-100">
      {/* Top Banner */}
      <header className="w-full bg-white flex items-center px-10 h-16 border-b border-gray-200 sticky top-0 z-50">
        <CAQHLogo className="w-auto h-8 mr-6" />
        <div className="portal-title text-lg font-bold text-blue-900 mr-auto font-['Volte']">
        </div>
        <div className="flex items-center">
          <div className="flex items-center gap-6">
            <Bell className="w-5 h-5 text-gray-600 cursor-pointer hover:text-gray-800" />
            <HelpCircle className="w-5 h-5 text-gray-600 cursor-pointer hover:text-gray-800" />
            <Settings className="w-5 h-5 text-gray-600 cursor-pointer hover:text-gray-800" />
          </div>
        </div>
      </header>

      <main className="container mx-auto py-6 px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">
                Provider Search Results
              </h2>
              <p className="text-gray-500">
                Data refreshed today at {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>

          {/* Demo/Help Section */}
          {showDemo && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-2">
                  <Lightbulb className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-800">How to Use Provider Search</h3>
                </div>
                <button 
                  onClick={() => setShowDemo(false)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-blue-700 mb-3">
                Ask any question about providers and get instant results. Try these examples:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {demoQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleDemoClick(question)}
                    className="text-left p-2 bg-white border border-blue-300 rounded text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    "{question}"
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4 flex flex-wrap justify-between items-center">
            <div className="relative flex-1 max-w-3xl mr-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  {isSearching ? (
                    <Loader2 className="absolute left-3 top-2.5 w-5 h-5 text-blue-500 animate-spin" />
                  ) : (
                    <img src={sparklesIcon} alt="Search" className="absolute left-3 top-2.5 w-5 h-5" />
                  )}
                  <input 
                    type="text" 
                    placeholder="Ask any question about providers - press 'Enter' to search!" 
                    className="w-full pl-10 pr-4 py-2 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isSearching}
                  />
                </div>
                {!searchQuery && !showDemo && (
                  <button
                    onClick={() => setShowDemo(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded whitespace-nowrap"
                  >
                    Show examples
                  </button>
                )}
              </div>
            </div>
            <div className="flex space-x-4 mb-2 md:mb-0">
              <ColumnSelector columns={visibleColumns} toggleColumnVisibility={toggleColumnVisibility} />
              <button onClick={() => setIsSqlModalOpen(true)} className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                View SQL
              </button>
            </div>
          </div>

          {/* Error Display */}
          {searchError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{searchError}</p>
            </div>
          )}

          {/* Search Results Summary */}
          {searchResult?.summary && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <img src={sparklesIcon} alt="Search result" className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-green-800 font-medium">{searchResult.summary}</p>
                  {displayData.length !== data.length && (
                    <p className="text-green-700 text-sm mt-1">
                      Showing {displayData.length} of {data.length} total providers
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <ProviderTable 
            data={displayData} 
            columns={visibleColumns.filter(col => col.isVisible)} 
            initialSort={null}
          />
        </div>
      </main>
      <SqlModal isOpen={isSqlModalOpen} onClose={() => setIsSqlModalOpen(false)} sql={currentSql} />
    </div>;
}