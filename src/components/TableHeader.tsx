import React from 'react';
import { X } from 'lucide-react';

interface TableHeaderProps {
  resultCount: number;
  totalCount: number;
  isFiltered: boolean;
  onClearFilters: () => void;
}

export const TableHeader: React.FC<TableHeaderProps> = ({
  resultCount,
  totalCount,
  isFiltered,
  onClearFilters
}) => {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-gray-900">
          Provider Data
        </h2>
        <div className="text-sm text-gray-600">
          {isFiltered ? (
            <span>
              Showing {resultCount.toLocaleString()} of {totalCount.toLocaleString()} providers
            </span>
          ) : (
            <span>
              {totalCount.toLocaleString()} providers
            </span>
          )}
        </div>
      </div>
      
      {isFiltered && (
        <button
          onClick={onClearFilters}
          className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <X className="w-4 h-4" />
          Clear Filters
        </button>
      )}
    </div>
  );
};