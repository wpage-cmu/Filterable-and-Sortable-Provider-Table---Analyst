import React from 'react';
import { XIcon } from 'lucide-react';
type SqlModalProps = {
  isOpen: boolean;
  onClose: () => void;
  sql: string;
};
export const SqlModal = ({
  isOpen,
  onClose,
  sql
}: SqlModalProps) => {
  if (!isOpen) return null;
  return <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl mx-4 relative">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">Generated SQL Query</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Close">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
            <code className="text-sm">{sql}</code>
          </pre>
        </div>
      </div>
    </div>;
};