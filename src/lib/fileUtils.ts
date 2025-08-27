import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Types for file handling
export interface UploadedFile {
  uri: string;        // Gemini file URI after upload
  mimeType: string;   // File MIME type
  name: string;       // Original filename
  size?: number;      // File size in bytes
}

export interface FileUploadResult {
  success: boolean;
  files: UploadedFile[];
  errors: string[];
}

// Initialize Gemini AI instance
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

// Supported file types for upload
export const SUPPORTED_MIME_TYPES = [
  'text/plain',
  'text/markdown',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/json',
];

// Maximum file size (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Upload files to Gemini and return file URIs for use in content generation
 */
export async function uploadFilesToGemini(files: File[]): Promise<FileUploadResult> {
  const uploadedFiles: UploadedFile[] = [];
  const errors: string[] = [];

  if (!process.env.GEMINI_API_KEY) {
    return {
      success: false,
      files: [],
      errors: ['Gemini API key not configured']
    };
  }

  for (const file of files) {
    try {
      // Validate file type
      if (!SUPPORTED_MIME_TYPES.includes(file.type) && !file.name.endsWith('.md') && !file.name.endsWith('.txt')) {
        errors.push(`Unsupported file type: ${file.name} (${file.type})`);
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`File too large: ${file.name} (${Math.round(file.size / 1024 / 1024)}MB > 10MB)`);
        continue;
      }

      // Convert File to Buffer for Gemini upload
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Debug logging
      console.log(`Uploading file: ${file.name}, size: ${file.size}, buffer length: ${buffer.length}`);

      // Create temporary file path
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `gemini_upload_${Date.now()}_${file.name}`);
      
      try {
        // Write buffer to temporary file
        fs.writeFileSync(tempFilePath, buffer);
        
        // Upload to Gemini using file path
        const geminiFile = await ai.files.upload({
          file: tempFilePath,
          config: {
            mimeType: file.type || getMimeTypeFromExtension(file.name),
            displayName: file.name
          }
        });

        // Wait for file to be processed (especially important for videos/large files)
        let fileInfo = await ai.files.get({ name: geminiFile.name });
        let attempts = 0;
        const maxAttempts = 10;

        while (fileInfo.state === 'PROCESSING' && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          fileInfo = await ai.files.get({ name: geminiFile.name });
          attempts++;
        }

        if (fileInfo.state === 'FAILED') {
          errors.push(`Failed to process file: ${file.name}`);
          continue;
        }

        if (fileInfo.state === 'PROCESSING' && attempts >= maxAttempts) {
          errors.push(`File processing timeout: ${file.name}`);
          continue;
        }

        uploadedFiles.push({
          uri: geminiFile.uri,
          mimeType: geminiFile.mimeType || file.type,
          name: file.name,
          size: file.size
        });

      } catch (uploadError) {
        console.error(`Error uploading file ${file.name}:`, uploadError);
        errors.push(`Failed to upload ${file.name}: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
      } finally {
        // Clean up temporary file if it exists
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        } catch (cleanupError) {
          console.warn(`Failed to clean up temp file ${tempFilePath}:`, cleanupError);
        }
      }

    } catch (error) {
      console.error(`Error uploading file ${file.name}:`, error);
      errors.push(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    success: uploadedFiles.length > 0 || errors.length === 0,
    files: uploadedFiles,
    errors
  };
}

/**
 * Create file parts for use in Gemini content generation
 */
export function createFilePartsFromUploaded(uploadedFiles: UploadedFile[]) {
  return uploadedFiles.map(file => ({
    fileData: {
      mimeType: file.mimeType,
      fileUri: file.uri
    }
  }));
}

/**
 * Get MIME type from file extension as fallback
 */
function getMimeTypeFromExtension(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  const mimeMap: Record<string, string> = {
    'txt': 'text/plain',
    'md': 'text/markdown',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'json': 'application/json'
  };
  return mimeMap[ext || ''] || 'application/octet-stream';
}

/**
 * Parse files from FormData (for multipart/form-data requests)
 */
export async function parseFilesFromFormData(formData: FormData): Promise<File[]> {
  const files: File[] = [];
  
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('file-') && value instanceof File) {
      files.push(value);
    }
  }
  
  return files;
}

/**
 * Parse files from JSON payload (for base64 encoded files)
 */
export function parseFilesFromJSON(filesData: Array<{name: string; content: string; type: string; size?: number}>): File[] {
  const files: File[] = [];
  
  for (const fileData of filesData) {
    if (fileData.name && fileData.content && fileData.type) {
      try {
        // Decode base64 content
        const binaryString = atob(fileData.content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const file = new File([bytes], fileData.name, { type: fileData.type });
        files.push(file);
      } catch (error) {
        console.error(`Error parsing file ${fileData.name}:`, error);
      }
    }
  }
  
  return files;
}