'use client';

import { useState, useRef } from 'react';
import { Modal } from './ui/Modal';

interface UploadResult {
  success: boolean;
  message?: string;
  insertedCount?: number;
  warnings?: string[];
  errors?: Array<{ row: number; field: string; message: string }>;
  error?: string;
}

interface MutualFundTransactionUploadModalProps {
  onClose: () => void;
  onUploadComplete: () => void;
}

export default function MutualFundTransactionUploadModal({
  onClose,
  onUploadComplete,
}: MutualFundTransactionUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    const allowedExtensions = ['xlsx', 'xls', 'csv', 'pdf'];
    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();

    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      alert('Please upload a valid Excel (.xlsx, .xls), CSV, or PDF file');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
    setResult(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/mutual-funds/transactions/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        setTimeout(() => {
          onUploadComplete();
          onClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setResult({
        success: false,
        error: 'Failed to upload file. Please try again.',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Upload Mutual Fund Transactions"
      subtitle="Upload Excel, CSV, or PDF file with transaction data"
    >
      <div className="space-y-6">
        {/* File Upload Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            dragActive
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20'
              : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.pdf"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {file ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">{file.name}</span>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Remove file
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <svg
                className="mx-auto h-12 w-12 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                >
                  Click to upload
                </button>
                <span className="text-slate-600 dark:text-slate-400"> or drag and drop</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Excel (.xlsx, .xls), CSV, or PDF (max 10MB)
              </p>
            </div>
          )}
        </div>

        {/* Upload Result */}
        {result && (
          <div
            className={`rounded-xl p-4 ${
              result.success
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800'
            }`}
          >
            {result.success ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                  {result.message || 'Upload successful!'}
                </p>
                {result.insertedCount !== undefined && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    {result.insertedCount} transaction(s) imported
                  </p>
                )}
                {result.warnings && result.warnings.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Warnings:</p>
                    <ul className="text-xs text-amber-600 dark:text-amber-400 list-disc list-inside">
                      {result.warnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-rose-800 dark:text-rose-200">
                  {result.error || 'Upload failed'}
                </p>
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto">
                    <p className="text-xs font-medium text-rose-700 dark:text-rose-300">Errors:</p>
                    <ul className="text-xs text-rose-600 dark:text-rose-400 list-disc list-inside">
                      {result.errors.slice(0, 5).map((error, idx) => (
                        <li key={idx}>
                          Row {error.row}: {error.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="flex-1 px-6 py-3 rounded-xl font-semibold text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex-1 px-6 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}


