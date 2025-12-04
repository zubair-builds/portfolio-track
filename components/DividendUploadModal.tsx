/**
 * Dividend Upload Modal Component
 * Handle Excel/CSV file upload for dividend data
 */

'use client';

import { useState, useRef } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface UploadResult {
  success: boolean;
  data?: {
    inserted: number;
    skipped: number;
    total: number;
  };
  warnings?: string[];
  duplicates?: string[];
  errors?: Array<{ row: number; field: string; message: string }>;
  error?: string;
  message?: string;
}

interface DividendUploadModalProps {
  onClose: () => void;
  onUploadComplete: () => void;
}

export default function DividendUploadModal({ onClose, onUploadComplete }: DividendUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [importMode, setImportMode] = useState<'skip' | 'overwrite'>('skip');
  const [fileType, setFileType] = useState<'announcement' | 'payment'>('payment');
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
    const allowedExtensions = ['xlsx', 'xls', 'csv'];
    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();

    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      alert('Please upload a valid Excel (.xlsx, .xls) or CSV file');
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
      formData.append('mode', importMode);

      const token = localStorage.getItem('token');
      const endpoint = '/api/dividends/upload';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
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
      title="Upload Dividend Data"
      subtitle="Upload Excel or CSV file with dividend announcements"
    >
      <div className="space-y-6">
        {/* File Type Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Select File Format
          </label>
          <div className="flex gap-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="payment"
                checked={fileType === 'payment'}
                onChange={(e) => setFileType(e.target.value as 'payment')}
                className="mr-2"
                disabled={!!file}
              />
              <div className="text-sm">
                <div className="font-medium text-slate-700 dark:text-slate-300">
                  Payment Dividend Report
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  CDC format with warrant numbers and tax details
                </div>
              </div>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="announcement"
                checked={fileType === 'announcement'}
                onChange={(e) => setFileType(e.target.value as 'announcement')}
                className="mr-2"
                disabled={!!file}
              />
              <div className="text-sm">
                <div className="font-medium text-slate-700 dark:text-slate-300">
                  Dividend Announcement
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Standard format with dates and financials
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
            : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'
            }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {!file ? (
            <>
              <svg
                className="w-12 h-12 mx-auto mb-4 text-slate-400"
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
              <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                Drag & drop your file here
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                or click to browse
              </p>
              <Button
                variant="primary"
                onClick={() => fileInputRef.current?.click()}
              >
                Select File
              </Button>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
                Supported formats: Excel (.xlsx, .xls), CSV • Max size: 10MB
              </p>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <svg
                  className="w-10 h-10 text-emerald-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <div className="text-left">
                  <p className="font-medium text-slate-900 dark:text-white">{file.name}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setFile(null);
                  setResult(null);
                }}
              >
                Change File
              </Button>
            </div>
          )}
        </div>

        {/* Import Mode */}
        {file && !result && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Duplicate Handling
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="skip"
                  checked={importMode === 'skip'}
                  onChange={(e) => setImportMode(e.target.value as 'skip')}
                  className="mr-2"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Skip duplicates
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="overwrite"
                  checked={importMode === 'overwrite'}
                  onChange={(e) => setImportMode(e.target.value as 'overwrite')}
                  className="mr-2"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Overwrite existing
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div
            className={`p-4 rounded-lg border ${result.success
              ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900'
              : 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900'
              }`}
          >
            <div className="flex items-start gap-2">
              {result.success ? (
                <svg
                  className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <div className="flex-1">
                <p
                  className={`font-medium ${result.success
                    ? 'text-emerald-800 dark:text-emerald-200'
                    : 'text-red-800 dark:text-red-200'
                    }`}
                >
                  {result.message || result.error}
                </p>

                {result.success && result.data && (
                  <div className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
                    <p>✓ Imported: {result.data.inserted} records</p>
                    {result.data.skipped > 0 && <p>⊘ Skipped: {result.data.skipped} records</p>}
                  </div>
                )}

                {result.warnings && result.warnings.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {result.warnings.map((warning, idx) => (
                      <p key={idx} className="text-xs text-amber-600 dark:text-amber-400">
                        ⚠ {warning}
                      </p>
                    ))}
                  </div>
                )}

                {result.errors && result.errors.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                    {result.errors.slice(0, 10).map((error, idx) => (
                      <p key={idx} className="text-xs text-red-700 dark:text-red-300">
                        Row {error.row}, {error.field}: {error.message}
                      </p>
                    ))}
                    {result.errors.length > 10 && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        ... and {result.errors.length - 10} more errors
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={uploading}
            className="flex-1"
          >
            {result?.success ? 'Close' : 'Cancel'}
          </Button>
          <Button
            variant="primary"
            onClick={handleUpload}
            disabled={!file || uploading || (result?.success === true)}
            className="flex-1"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Uploading...
              </>
            ) : (
              'Upload & Import'
            )}
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1 pt-4 border-t border-slate-200 dark:border-slate-700">
          <p className="font-medium">
            {fileType === 'payment' ? 'Payment Dividend Format:' : 'Dividend Announcement Format:'}
          </p>
          {fileType === 'payment' ? (
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>File must have 12 lines of metadata header (will be skipped)</li>
              <li>Column headers on line 13</li>
              <li>Required: Sec. Symbol - Sec. Name (format: SYMBOL - Company Name)</li>
              <li>Required: Payment Date (DD/MM/YYYY format)</li>
              <li>Required: Warrant #, Filer Status*</li>
              <li>Required: Net Dividend, Gross Dividend, Tax Deducted, Zakat Deducted</li>
              <li>Numeric values can include commas and quotes (e.g., &quot;1,000.00&quot;)</li>
            </ul>
          ) : (
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>Symbol, Company Name, Sector, Dividend Type</li>
              <li>Announcement Date, Ex-Dividend Date, Book Closure Start/End</li>
              <li>For Cash: Dividend Rate or Dividend Per Share</li>
              <li>For Bonus: Bonus Ratio (e.g., &quot;1:10&quot;)</li>
              <li>For Right Shares: Right Ratio (e.g., &quot;1:5&quot;)</li>
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
