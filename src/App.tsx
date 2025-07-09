import React, { useEffect, useState } from 'react';
import { ProviderTable } from './components/ProviderTable';
import { ColumnSelector } from './components/ColumnSelector';
import { TableHeader } from './components/TableHeader';
import { mockData } from './utils/data';
import { processNaturalLanguageSearch } from './utils/searchProcessor';
import { SqlModal } from './components/SqlModal';
import { generateSql } from './utils/sqlGenerator';
import { MessageCircle, Lightbulb, X } from 'lucide-react';
import { CAQHLogo } from './components/CAQHLogo';
import { searchProvidersWithLLM } from './services/llmService';

// Add this at the top of your App.tsx, right after the imports
console.log('API Key loaded:', import.meta.env.VITE_CLAUDE_API_KEY ? 'Yes' : 'No');
console.log('First few chars:', import.meta.env.VITE_CLAUDE_API_KEY?.substring(0, 10));

export function App() {
  const [data] = useState(mockData);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  // New state to track actual table filters
  const [tableFilters, setTableFilters] = useState({});

  // Add this temporary function inside your App component (after the useState declarations)
  const testLLM = async () => {
    console.log('Testing LLM with complex query...');
    try {
      const result = await searchProvidersWithLLM('show me urologists in california', data);
      console.log('LLM Result:', result);
    } catch (error) {
      console.error('LLM Test failed:', error);
    }
  };
  
  // Demo suggestions for users
  const demoQuestions = [
    "Which providers have recently attested?",
    "Show me providers in California",
    "Find specialists by type",
    "Who needs to update their attestation?"
  ];

  // Modified allColumns to include isAlwaysVisible property
  const allColumns = [{
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
    id: 'npi',
    Header: 'NPI',
    accessor: 'npi',
    isVisible: true,
    isAlwaysVisible: true
  }, {
    id: 'attestationStatus',
    Header: 'Attestation Status',
    accessor: 'attestationStatus',
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
  
  // Update column visibility based on search results and filters
  useEffect(() => {
    if (searchResult) {
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
  
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const result = processNaturalLanguageSearch(query, data);
    setSearchResult(result);
  };
  
  const handleDemoClick = (question: string) => {
    handleSearch(question);
    setShowDemo(false);
  };

  // Callback function to receive filters from ProviderTable
  const handleFiltersChange = (filters) => {
    setTableFilters(filters);
  };
  
  const displayData = searchResult?.filteredData || data;
  
  // Use the actual table filters for SQL generation
  const currentSql = generateSql(searchQuery, tableFilters, searchResult?.sort || {
    key: null,
    direction: 'asc'
  });
  
  return <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-900 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <CAQHLogo className="w-10 h-10" />
            <h1 className="text-h1">Provider Data Portal</h1>
          </div>
        </div>
      </header>
      <main className="container mx-auto py-6 px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <h2 className="text-h2">
              Provider Search Results
            </h2>
            <p className="text-body2 text-gray-500">
              Generated today at {new Date().toLocaleTimeString()}
            </p>
          </div>

          {/* Demo/Help Section */}
          {showDemo && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-2">
                  <Lightbulb className="w-5 h-5 text-blue-600" />
                  <h3 className="text-body1 font-semibold text-blue-800">How to Use Provider Search</h3>
                </div>
                <button 
                  onClick={() => setShowDemo(false)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-body2 text-blue-700 mb-3">
                Ask any question about providers and get instant results. Try these examples:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {demoQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleDemoClick(question)}
                    className="text-left p-2 bg-white border border-blue-300 rounded text-blue-700 hover:bg-blue-100 transition-colors text-body2"
                  >
                    "{question}"
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4 flex flex-wrap justify-between items-center">
            <div className="flex space-x-4 mb-2 md:mb-0">
              <ColumnSelector columns={visibleColumns} toggleColumnVisibility={toggleColumnVisibility} />
              <button onClick={() => setIsSqlModalOpen(true)} className="flex items-center px-3 py-2 text-body2 font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                View SQL
              </button>
            </div>
            <div className="relative flex-1 max-w-xl ml-4">
              <div className="relative">
                <MessageCircle className="absolute left-3 top-2.5 w-5 h-5 text-blue-500" />
                <input 
                  type="text" 
                  placeholder="Ask any question about providers - I'm here to help with your provider search..." 
                  className="w-full pl-10 pr-4 py-2 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" 
                  value={searchQuery} 
                  onChange={e => handleSearch(e.target.value)} 
                />
              </div>
              {!searchQuery && !showDemo && (
                <button
                  onClick={() => setShowDemo(true)}
                  className="absolute right-2 top-2 text-note text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded"
                >
                  Show examples
                </button>
              )}
              <button onClick={testLLM} className="bg-red-500 text-white px-4 py-2 rounded ml-2">
                Test LLM
              </button>
            </div>
          </div>
          {searchResult?.description && <div className="mb-4">
              <p className="text-body2 text-gray-600 mb-1">
                {searchResult.description}
              </p>
              {searchResult.response &&                 <div className="text-body2 text-blue-600">
                  {searchResult.response.split('\n').map((line, index) => {
              if (line.includes("'")) {
                const suggestion = line.match(/'([^']+)'/)?.[1];
                return suggestion ? <button key={index} onClick={() => handleSearch(suggestion)} className="block text-left hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1 -ml-1">
                          {line}
                        </button> : <p key={index} className="italic">
                          {line}
                        </p>;
              }
              return <p key={index} className="italic">
                        {line}
                      </p>;
            })}
                </div>}
            </div>}
          <ProviderTable 
            data={displayData} 
            columns={visibleColumns.filter(col => col.isVisible)} 
            initialSort={searchResult?.sort}
            onFiltersChange={handleFiltersChange}
          />
        </div>
      </main>
      <SqlModal isOpen={isSqlModalOpen} onClose={() => setIsSqlModalOpen(false)} sql={currentSql} />
    </div>;
}