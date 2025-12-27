'use client';

import { useState } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  loading?: boolean;
}

export default function DeleteConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  itemName, 
  loading = false 
}: DeleteConfirmModalProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }
    onConfirm();
  };

  const handleClose = () => {
    setShowConfirm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in-up">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scale-in relative overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-orange-50 opacity-50"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-2 rounded-full">
                <AlertTriangle className="text-red-600" size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete Habit</h3>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 touch-manipulation"
              disabled={loading}
            >
              <X size={20} />
            </button>
          </div>

          <div className="mb-6">
            <p className="text-gray-700 mb-2">
              Are you sure you want to delete this habit?
            </p>
            <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-red-500">
              <p className="font-semibold text-gray-900 text-sm">{itemName}</p>
            </div>
            
            {!showConfirm ? (
              <p className="text-sm text-gray-600 mt-3 font-medium">
                This action cannot be undone.
              </p>
            ) : (
              <div className="mt-3 p-3 bg-red-100 rounded-lg border border-red-200 animate-pulse">
                <p className="text-red-800 font-semibold text-sm flex items-center gap-2">
                  <Trash2 size={16} />
                  Click again to confirm deletion
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all font-semibold text-sm touch-manipulation disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`flex-1 px-4 py-3 rounded-lg font-bold text-sm transition-all touch-manipulation disabled:opacity-50 flex items-center justify-center gap-2 ${
                showConfirm
                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  {showConfirm ? 'Confirm Delete' : 'Delete'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
