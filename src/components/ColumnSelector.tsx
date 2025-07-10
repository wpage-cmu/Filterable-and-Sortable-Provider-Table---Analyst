import React, { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';

export const ColumnSelector = ({
  columns,
  toggleColumnVisibility
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = event => {
      if (isOpen && !event.target.closest('.column-selector')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return <div className="relative column-selector">
      <button 
        className="flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 border border-blue-600 rounded-md hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-sm hover:shadow-md" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <Settings className="w-4 h-4 mr-2" />
        <span className="font-semibold">Identifiers</span>
        <span className="ml-2 text-blue-200">({columns.filter(col => col.isVisible).length})</span>
      </button>
      {isOpen && <div className="absolute left-0 z-10 mt-2 w-64 origin-top-left rounded-lg bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-200">
          <div className="py-2">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
              Available Identifiers
            </div>
            {columns.map(column => <div 
                key={column.id} 
                className={`flex items-center px-4 py-3 text-sm cursor-pointer transition-colors duration-150 ${
                  column.isVisible 
                    ? 'bg-blue-50 hover:bg-blue-100 text-blue-900' 
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
                onClick={() => toggleColumnVisibility(column.id)}
              >
                <div className={`w-4 h-4 mr-3 rounded border-2 flex items-center justify-center ${
                  column.isVisible 
                    ? 'bg-blue-600 border-blue-600' 
                    : 'border-gray-300'
                }`}>
                  {column.isVisible && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className={`flex-1 ${column.isVisible ? 'font-medium' : ''}`}>
                  {column.Header}
                </span>
                {column.isAlwaysVisible && (
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                    Default
                  </span>
                )}
              </div>)}
          </div>
        </div>}
    </div>;
};