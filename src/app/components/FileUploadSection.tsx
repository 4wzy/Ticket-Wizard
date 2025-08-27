"use client";

import React, { useState, useRef } from 'react';
import { 
  DocumentArrowUpIcon, 
  XMarkIcon, 
  DocumentTextIcon, 
  PhotoIcon,
  DocumentIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface FileUploadSectionProps {
  onFilesChange?: (files: File[]) => void;
  onJiraAttachmentsChange?: (selectedAttachmentIds: string[]) => void;
  jiraAttachments?: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
  }>;
  isJiraPopulated?: boolean;
}

const FileUploadSection: React.FC<FileUploadSectionProps> = ({ 
  onFilesChange, 
  onJiraAttachmentsChange,
  jiraAttachments = [],
  isJiraPopulated = false
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [selectedJiraAttachments, setSelectedJiraAttachments] = useState<Set<string>>(new Set());
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      // Check file size limit (10MB = 10 * 1024 * 1024 bytes)
      const maxFileSize = 10 * 1024 * 1024;
      if (file.size > maxFileSize) {
        console.warn(`File "${file.name}" exceeds 10MB limit and was skipped`);
        return false;
      }
      
      // Allow common document types and images
      const allowedTypes = [
        'text/plain',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'text/markdown',
        'application/json'
      ];
      return allowedTypes.includes(file.type) || file.name.endsWith('.md') || file.name.endsWith('.txt');
    });

    if (validFiles.length !== fileArray.length) {
      // Could show a toast notification here about unsupported files or size limits
      console.warn('Some files were not supported or exceeded size limits and were skipped');
    }

    const newFiles = [...uploadedFiles, ...validFiles];
    setUploadedFiles(newFiles);
    onFilesChange?.(newFiles);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileSelect(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    onFilesChange?.(newFiles);
  };

  const handleJiraAttachmentToggle = (attachmentId: string) => {
    const newSelected = new Set(selectedJiraAttachments);
    if (newSelected.has(attachmentId)) {
      newSelected.delete(attachmentId);
    } else {
      newSelected.add(attachmentId);
    }
    setSelectedJiraAttachments(newSelected);
    onJiraAttachmentsChange?.(Array.from(newSelected));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <PhotoIcon className="h-5 w-5 text-green-400" />;
    } else if (file.type === 'application/pdf') {
      return <DocumentIcon className="h-5 w-5 text-red-400" />;
    } else {
      return <DocumentTextIcon className="h-5 w-5 text-blue-400" />;
    }
  };

  const getJiraAttachmentIcon = (type: string, fileName: string) => {
    if (type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)) {
      return <PhotoIcon className="h-5 w-5 text-green-400" />;
    } else if (type === 'application/pdf' || fileName.endsWith('.pdf')) {
      return <DocumentIcon className="h-5 w-5 text-red-400" />;
    } else {
      return <DocumentTextIcon className="h-5 w-5 text-blue-400" />;
    }
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <DocumentArrowUpIcon className="h-5 w-5 mr-2 text-indigo-400" />
          <h3 className="text-lg font-semibold text-neutral-200">
            Additional Context Files
          </h3>
        </div>
        <div className="flex items-center text-xs text-neutral-400">
          <InformationCircleIcon className="h-4 w-4 mr-1" />
          <span>For AI context only</span>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-indigo-900/20 border border-indigo-800/50 text-indigo-300 px-4 py-3 rounded-lg mb-4 text-sm">
        <div className="flex items-start">
          <InformationCircleIcon className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium mb-1">Upload files to provide additional context to the AI</p>
            <p className="text-indigo-400/80 mb-2">
              These files help the AI better understand your requirements. 
              The AI will read and analyze them but won&apos;t modify or return these files.
            </p>
            <p className="text-indigo-300/90 font-medium">
              📁 File limit: 10MB per file
            </p>
          </div>
        </div>
      </div>

      {/* Existing Jira Attachments Section */}
      {isJiraPopulated && jiraAttachments.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-neutral-300 mb-3 flex items-center">
            <DocumentIcon className="h-4 w-4 mr-2 text-orange-400" />
            Existing Jira Attachments ({jiraAttachments.length})
          </h4>
          <div className="bg-orange-900/10 border border-orange-800/30 rounded-lg p-4 mb-4">
            <p className="text-sm text-orange-300 mb-3">
              Select which existing attachments to include for AI analysis:
            </p>
            <div className="space-y-2">
              {jiraAttachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-3 bg-neutral-800/30 rounded-lg border border-neutral-700/50"
                >
                  <div className="flex items-center min-w-0 flex-1">
                    <input
                      type="checkbox"
                      id={`jira-${attachment.id}`}
                      checked={selectedJiraAttachments.has(attachment.id)}
                      onChange={() => handleJiraAttachmentToggle(attachment.id)}
                      className="mr-3 w-4 h-4 text-orange-500 bg-neutral-700 border-neutral-600 rounded focus:ring-orange-500 focus:ring-2"
                    />
                    {getJiraAttachmentIcon(attachment.type, attachment.name)}
                    <div className="ml-3 min-w-0 flex-1">
                      <label 
                        htmlFor={`jira-${attachment.id}`}
                        className="text-sm font-medium text-neutral-200 truncate cursor-pointer block"
                      >
                        {attachment.name}
                      </label>
                      <p className="text-xs text-neutral-500">
                        {formatFileSize(attachment.size)}
                      </p>
                    </div>
                  </div>
                  <div className="ml-3 text-xs bg-orange-600/20 text-orange-400 px-2 py-1 rounded">
                    From Jira
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-all duration-200 cursor-pointer ${
          isDragOver
            ? 'border-indigo-400 bg-indigo-500/10'
            : 'border-neutral-600 hover:border-neutral-500 hover:bg-neutral-800/30'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,.md,.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.json"
          onChange={handleFileInputChange}
          className="hidden"
        />
        
        <div className="text-center">
          <DocumentArrowUpIcon className={`mx-auto h-12 w-12 ${
            isDragOver ? 'text-indigo-400' : 'text-neutral-500'
          }`} />
          <p className="mt-4 text-lg font-medium text-neutral-300">
            {isDragOver ? 'Drop files here' : (isJiraPopulated ? 'Upload additional context files' : 'Upload context files')}
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            {isJiraPopulated 
              ? 'Add more files beyond what\'s already attached to the Jira ticket'
              : 'Drag and drop files here, or click to select'
            }
          </p>
          <p className="mt-1 text-xs text-neutral-600">
            Supports: PDF, DOC, TXT, MD, Images (PNG, JPG, GIF, WebP), JSON
          </p>
          <p className="mt-1 text-xs text-neutral-500 font-medium">
            Maximum file size: 10MB per file
          </p>
        </div>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-neutral-300 mb-3">
            {isJiraPopulated ? 'Additional Uploaded Files' : 'Uploaded Files'} ({uploadedFiles.length})
          </h4>
          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-3 bg-neutral-800/50 rounded-lg border border-neutral-700"
              >
                <div className="flex items-center min-w-0 flex-1">
                  {getFileIcon(file)}
                  <div className="ml-3 min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-200 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="ml-3 p-1 rounded-full hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                  title="Remove file"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploadSection;
