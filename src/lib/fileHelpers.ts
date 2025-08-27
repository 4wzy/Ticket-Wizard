/**
 * Client-side helper functions for file handling
 */

export interface FileData {
  name: string;
  type: string;
  content: string; // base64 encoded
  size: number;
}

/**
 * Convert File objects to base64 encoded data for API transmission
 */
export async function convertFilesToBase64(files: File[]): Promise<FileData[]> {
  const filePromises = files.map(async (file): Promise<FileData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Remove the data URL prefix (e.g., "data:image/png;base64,")
          const base64Content = reader.result.split(',')[1];
          resolve({
            name: file.name,
            type: file.type,
            content: base64Content,
            size: file.size
          });
        } else {
          reject(new Error(`Failed to read file: ${file.name}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error(`Error reading file: ${file.name}`));
      };
      
      reader.readAsDataURL(file);
    });
  });
  
  try {
    return await Promise.all(filePromises);
  } catch (error) {
    console.error('Error converting files to base64:', error);
    throw error;
  }
}

/**
 * Validate file before processing
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    'text/plain',
    'text/markdown',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'application/json'
  ];
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File "${file.name}" is too large (${Math.round(file.size / 1024 / 1024)}MB > 10MB)`
    };
  }
  
  const isValidType = allowedTypes.includes(file.type) || 
                     file.name.endsWith('.md') || 
                     file.name.endsWith('.txt');
  
  if (!isValidType) {
    return {
      valid: false,
      error: `File "${file.name}" has unsupported type: ${file.type}`
    };
  }
  
  return { valid: true };
}

/**
 * Validate multiple files
 */
export function validateFiles(files: File[]): { validFiles: File[]; errors: string[] } {
  const validFiles: File[] = [];
  const errors: string[] = [];
  
  for (const file of files) {
    const validation = validateFile(file);
    if (validation.valid) {
      validFiles.push(file);
    } else if (validation.error) {
      errors.push(validation.error);
    }
  }
  
  return { validFiles, errors };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}