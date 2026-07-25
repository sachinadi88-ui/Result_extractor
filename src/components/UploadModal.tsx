import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, FileImage, Sparkles, AlertCircle, Loader2, Plus, Trash2, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { StudentRecord } from '../types';
import { compressAndResizeImage } from '../utils/imageCompress';

export interface ImageUploadItem {
  id: string;
  imageBase64: string;
  mimeType: string;
  fileName: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
  extractedCount?: number;
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtractionSuccess?: (records: Omit<StudentRecord, 'id' | 'uploadedAt'>[], imageBase64: string) => void;
  onSuccess?: (records: Omit<StudentRecord, 'id' | 'uploadedAt'>[], imageBase64: string) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onExtractionSuccess,
  onSuccess,
}) => {
  const [items, setItems] = useState<ImageUploadItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [batchSummary, setBatchSummary] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global paste handler when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const pasteItems = e.clipboardData?.items;
      if (!pasteItems) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < pasteItems.length; i++) {
        if (pasteItems[i].type.indexOf('image') !== -1) {
          const blob = pasteItems[i].getAsFile();
          if (blob) {
            imageFiles.push(blob);
          }
        }
      }

      if (imageFiles.length > 0) {
        handleFilesSelect(imageFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  // Reset modal state on close/open
  useEffect(() => {
    if (!isOpen) {
      setItems([]);
      setIsProcessing(false);
      setErrorMessage(null);
      setBatchSummary(null);
      setCurrentIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFilesSelect = (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));

    if (validFiles.length === 0) {
      setErrorMessage('Please select valid image files (PNG, JPG, WEBP, BMP).');
      return;
    }

    setErrorMessage(null);
    setBatchSummary(null);

    const promises = validFiles.map(async (file, idx) => {
      // Compress and resize image to prevent Vercel 4.5MB payload limit issues
      const compressed = await compressAndResizeImage(file, 1800, 0.85);
      return {
        id: `img-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
        imageBase64: compressed.base64,
        mimeType: compressed.mimeType,
        fileName: file.name || `Screenshot ${items.length + idx + 1}`,
        status: 'pending' as const,
      };
    });

    Promise.all(promises).then((newItems) => {
      setItems((prev) => [...prev, ...newItems]);
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelect(e.target.files);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelect(e.dataTransfer.files);
    }
  };

  const removeItem = (id: string) => {
    if (isProcessing) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const clearAllItems = () => {
    if (isProcessing) return;
    setItems([]);
    setErrorMessage(null);
    setBatchSummary(null);
  };

  const runExtractAi = async () => {
    const pendingItems = items.filter((it) => it.status === 'pending' || it.status === 'error');
    if (pendingItems.length === 0) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setBatchSummary(null);

    let totalExtracted = 0;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i];
      setCurrentIndex(i + 1);

      // Update item status to processing
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: 'processing', error: undefined } : it))
      );

      try {
        const response = await fetch('/api/extract-result', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageBase64: item.imageBase64,
            mimeType: item.mimeType,
          }),
        });

        const responseText = await response.text();
        let data: any;
        try {
          data = JSON.parse(responseText);
        } catch {
          let cleanMsg = 'A server error occurred on Vercel. Please verify GEMINI_API_KEY in Vercel > Settings > Environment Variables.';
          if (responseText.includes('GEMINI_API_KEY') || responseText.includes('api key') || responseText.includes('API_KEY')) {
            cleanMsg = 'GEMINI_API_KEY is missing or invalid. Please configure GEMINI_API_KEY in your Vercel Project Settings > Environment Variables.';
          } else if (responseText.includes('leaked') || responseText.includes('API key was reported as leaked')) {
            cleanMsg = 'Your Gemini API Key has been reported as leaked or compromised. Please update GEMINI_API_KEY in Vercel Project Settings > Environment Variables.';
          } else if (responseText.includes('PERMISSION_DENIED') || responseText.includes('403')) {
            cleanMsg = 'Permission Denied: Invalid or restricted GEMINI_API_KEY in Vercel Environment Variables.';
          } else if (responseText.includes('413') || responseText.includes('Payload Too Large')) {
            cleanMsg = 'File payload too large for serverless limit (max 4.5MB). Please upload a smaller screenshot.';
          } else if (response.status === 500) {
            cleanMsg = 'Vercel Server Error (500). Please check your Vercel logs and ensure GEMINI_API_KEY is set in Vercel Environment Variables.';
          } else if (responseText && !responseText.startsWith('<')) {
            cleanMsg = responseText.substring(0, 180);
          }
          throw new Error(cleanMsg);
        }

        if (!data.success) {
          throw new Error(data.error || 'Failed to extract data');
        }

        if (!data.students || data.students.length === 0) {
          throw new Error('No student results detected in screenshot');
        }

        // Success for this item
        const extractedCount = data.students.length;
        totalExtracted += extractedCount;
        successCount++;

        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, status: 'success', extractedCount } : it
          )
        );

        // Notify parent app of new extracted records
        const handleSuccessCallback = onExtractionSuccess || onSuccess;
        if (typeof handleSuccessCallback === 'function') {
          handleSuccessCallback(data.students, item.imageBase64);
        }
      } catch (err: any) {
        console.error(`Error processing image ${item.fileName}:`, err);
        failCount++;
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? { ...it, status: 'error', error: err.message || 'Extraction failed' }
              : it
          )
        );
      }
    }

    setIsProcessing(false);

    if (successCount > 0) {
      setBatchSummary(
        `Successfully extracted ${totalExtracted} student record(s) from ${successCount} screenshot(s)${
          failCount > 0 ? ` (${failCount} failed)` : ''
        }.`
      );
      // Auto close if all succeeded
      if (failCount === 0) {
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } else {
      setErrorMessage('Failed to extract student results from the uploaded screenshot(s). Please verify image clarity.');
    }
  };

  const pendingCount = items.filter((it) => it.status === 'pending' || it.status === 'error').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Upload Multiple Result Screenshots</h2>
              <p className="text-xs text-slate-500">Paste or drag multiple mark sheet / result screen captures</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleInputChange}
            accept="image/*"
            multiple
            className="hidden"
          />

          {/* Initial Dropzone if no items */}
          {items.length === 0 ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-emerald-600 bg-emerald-50 scale-[1.01]'
                  : 'border-slate-200 bg-slate-50/60 hover:border-emerald-400 hover:bg-slate-50'
              }`}
            >
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-3 shadow-sm">
                <FileImage className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Click to select multiple screenshots or drag &amp; drop
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Supports selecting multiple images at once (PNG, JPG, WEBP). You can also press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[10px]">Ctrl + V</kbd> to paste directly!
              </p>
            </div>
          ) : (
            /* Selected Screenshots Queue Preview */
            <div className="space-y-4">
              
              {/* Queue Controls Bar */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-800">Selected Screenshots ({items.length})</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium text-[11px] border border-emerald-100">
                    {items.filter((i) => i.status === 'success').length} Processed
                  </span>
                </div>
                {!isProcessing && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add More</span>
                    </button>
                    <button
                      onClick={clearAllItems}
                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 font-medium transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear All</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Grid of Screenshots */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`relative rounded-xl border overflow-hidden transition-all flex flex-col bg-slate-900 ${
                      item.status === 'processing'
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                        : item.status === 'success'
                        ? 'border-emerald-500/50 bg-slate-950'
                        : item.status === 'error'
                        ? 'border-red-500'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Image Thumbnail */}
                    <div className="h-32 w-full flex items-center justify-center p-2 bg-slate-950 relative overflow-hidden">
                      <img
                        src={item.imageBase64}
                        alt={item.fileName}
                        className="max-h-full max-w-full object-contain rounded"
                      />

                      {/* Remove Button */}
                      {!isProcessing && (
                        <button
                          onClick={() => removeItem(item.id)}
                          className="absolute top-2 right-2 p-1 rounded-full bg-slate-900/80 text-white hover:bg-red-600 transition-colors shadow-md cursor-pointer"
                          title="Remove screenshot"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Badge status overlay */}
                      <div className="absolute bottom-2 left-2 right-2">
                        {item.status === 'pending' && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800/90 text-slate-200 backdrop-blur-sm">
                            <ImageIcon className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[120px]">Ready #{idx + 1}</span>
                          </span>
                        )}
                        {item.status === 'processing' && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white shadow-md animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Extracting...</span>
                          </span>
                        )}
                        {item.status === 'success' && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white shadow-md">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{item.extractedCount} record(s) extracted</span>
                          </span>
                        )}
                        {item.status === 'error' && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white shadow-md">
                            <AlertCircle className="w-3 h-3" />
                            <span className="truncate max-w-[130px]">{item.error || 'Failed'}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* File Caption */}
                    <div className="px-2.5 py-1.5 bg-white border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-700 font-medium truncate max-w-[140px]" title={item.fileName}>
                        {item.fileName}
                      </span>
                      <span className="text-slate-400 font-mono text-[10px]">#{idx + 1}</span>
                    </div>
                  </div>
                ))}

                {/* Additional Drag & Drop Tile */}
                {!isProcessing && (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-xl h-40 flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-slate-400 hover:text-emerald-600"
                  >
                    <Plus className="w-6 h-6 mb-1" />
                    <span className="text-xs font-semibold">Add More Screenshots</span>
                  </div>
                )}
              </div>

              {/* Progress Bar when extracting */}
              {isProcessing && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-emerald-900 font-bold">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      <span>Processing screenshot {currentIndex} of {items.filter((i) => i.status === 'pending' || i.status === 'error' || i.status === 'processing').length}...</span>
                    </div>
                    <span>{Math.round((currentIndex / items.length) * 100)}%</span>
                  </div>
                  <div className="w-full bg-emerald-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(currentIndex / items.length) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Batch Summary */}
          {batchSummary && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center space-x-2 text-emerald-800 text-xs font-semibold animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{batchSummary}</span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-2.5 text-red-800 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100 shrink-0">
          <p className="text-[11px] text-slate-500">
            Supports batch processing of multiple mark sheets in one click
          </p>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
            >
              Cancel
            </button>
            <button
              onClick={runExtractAi}
              disabled={items.length === 0 || pendingCount === 0 || isProcessing}
              className="inline-flex items-center space-x-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Extracting Batch...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Extract {pendingCount > 0 ? `${pendingCount} Screenshot${pendingCount > 1 ? 's' : ''}` : 'Results'}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
