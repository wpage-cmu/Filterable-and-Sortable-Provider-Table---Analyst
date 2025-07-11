import React, { useEffect, useState } from 'react';
import { ProviderTable } from './components/ProviderTable';
import { ColumnSelector } from './components/ColumnSelector';
import { TableHeader } from './components/TableHeader';
import { mockData } from './utils/data';
import { processNaturalLanguageSearch } from './utils/searchProcessor';
import { SqlModal } from './components/SqlModal';
import { generateSql } from './utils/sqlGenerator';
import { MessageCircle, Lightbulb, X, Bell, HelpCircle, Settings } from 'lucide-react';
import { CAQHLogo } from './components/CAQHLogo';

export function App() {
  const [data] = useState(mockData);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

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
  
  const displayData = searchResult?.filteredData || data;
  const currentSql = generateSql(searchQuery, displayData === data ? {} : {
    attestationStatus: searchQuery
  }, searchResult?.sort || {
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
                  <MessageCircle className="absolute left-3 top-2.5 w-5 h-5 text-blue-500" />
                  <input 
                    type="text" 
                    placeholder="Ask any question about providers - I'm here to help with your provider search!" 
                    className="w-full pl-10 pr-4 py-2 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all" 
                    value={searchQuery} 
                    onChange={e => handleSearch(e.target.value)} 
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
          {searchResult?.description && <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">
                {searchResult.description}
              </p>
              {searchResult.response && <div className="text-sm text-blue-600">
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
          <ProviderTable data={displayData} columns={visibleColumns.filter(col => col.isVisible)} initialSort={searchResult?.sort} />
        </div>
      </main>
      <SqlModal isOpen={isSqlModalOpen} onClose={() => setIsSqlModalOpen(false)} sql={currentSql} />
    </div>;
}