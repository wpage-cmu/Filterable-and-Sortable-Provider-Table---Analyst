import React, { useState } from 'react';
import { XIcon, CopyIcon, CheckIcon } from 'lucide-react';

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
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl mx-4 relative">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">Generated SQL Query</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                copied 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              {copied ? (
                <>
                  <CheckIcon className="w-4 h-4 mr-1" />
                  Copied!
                </>
              ) : (
                <>
                  <CopyIcon className="w-4 h-4 mr-1" />
                  Copy
                </>
              )}
            </button>
            <button 
              onClick={onClose} 
              className="text-gray-500 hover:text-gray-700" 
              aria-label="Close"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-4">
          <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
            <code className="text-sm">{sql}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};