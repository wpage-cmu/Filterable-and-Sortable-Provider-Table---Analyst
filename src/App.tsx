import React, { useEffect, useState } from 'react';
import { ProviderTable } from './components/ProviderTable';
import { ColumnSelector } from './components/ColumnSelector';
import { TableHeader } from './components/TableHeader';
import { mockData } from './utils/data';
import { processNaturalLanguageSearch } from './utils/searchProcessor';
import { SqlModal } from './components/SqlModal';
import { generateSql } from './utils/sqlGenerator';
export function App() {
  const [data] = useState(mockData);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
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
  const displayData = searchResult?.filteredData || data;
  const currentSql = generateSql(searchQuery, displayData === data ? {} : {
    attestationStatus: searchQuery
  }, searchResult?.sort || {
    key: null,
    direction: 'asc'
  });
  return <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-900 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Provider Data</h1>
          <div className="flex items-center space-x-2">
            <button className="bg-blue-800 p-2 rounded-full">
              <span className="sr-only">Help</span>?
            </button>
          </div>
        </div>
      </header>
      <main className="container mx-auto py-6 px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">
              Provider Search Results
            </h2>
            <p className="text-gray-500">
              Generated today at {new Date().toLocaleTimeString()}
            </p>
          </div>
          <div className="mb-4 flex flex-wrap justify-between items-center">
            <div className="flex space-x-4 mb-2 md:mb-0">
              <ColumnSelector columns={visibleColumns} toggleColumnVisibility={toggleColumnVisibility} />
              <button onClick={() => setIsSqlModalOpen(true)} className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                View SQL
              </button>
            </div>
            <div className="relative flex-1 max-w-xl ml-4">
              <input type="text" placeholder='Try "Which providers have recently attested?" or just search...' className="w-full pl-10 pr-4 py-2 border rounded-lg" value={searchQuery} onChange={e => handleSearch(e.target.value)} />
              <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
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