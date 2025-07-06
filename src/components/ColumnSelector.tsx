import React, { useEffect, useState } from 'react';
import { ColumnsIcon } from 'lucide-react';
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
      <button className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50" onClick={() => setIsOpen(!isOpen)}>
        <ColumnsIcon className="w-5 h-5 mr-2" />
        Columns
      </button>
      {isOpen && <div className="absolute left-0 z-10 mt-2 w-56 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {columns.map(column => <div key={column.id} className="flex items-center px-4 py-2 text-sm cursor-pointer hover:bg-gray-100" onClick={() => toggleColumnVisibility(column.id)}>
                <input type="checkbox" className="mr-2" checked={column.isVisible} onChange={() => {}} />
                {column.Header}
              </div>)}
          </div>
        </div>}
    </div>;
};