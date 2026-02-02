'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type UploadStatus = 'pending' | 'compressing' | 'uploading' | 'success' | 'error';

type Attachment = {
  file: File;
  guestName: string;
  id: string;
  status?: UploadStatus;
  errorMessage?: string;
};

export default function GuestProfilePage() {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [retreatLeaderName, setRetreatLeaderName] = useState('Interviewer');
  const [recordType, setRecordType] = useState<'Check-In' | 'Check-Out'>('Check-In');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      addNewFiles(newFiles);
    }
  };
  
  const addNewFiles = (files: File[]) => {
    // Filter only audio files
    const audioFiles = files.filter(file => file.type.startsWith('audio/'));
    
    if (audioFiles.length === 0) {
      setError('Please upload audio files only');
      return;
    }
    
    const newAttachments = audioFiles.map(file => ({
      file,
      guestName: '',
      id: generateId()
    }));
    
    setAttachments(prev => [...prev, ...newAttachments]);
    setError('');
    setSuccessMessage(''); // Clear any previous success message
  };

  const generateId = () => {
    return Math.random().toString(36).substring(2, 15);
  };

  const handleGuestNameChange = (id: string, name: string) => {
    setAttachments(prevAttachments => 
      prevAttachments.map(attachment => 
        attachment.id === id ? { ...attachment, guestName: name } : attachment
      )
    );
  };

  const removeAttachment = (id: string) => {
    setAttachments(prevAttachments => 
      prevAttachments.filter(attachment => attachment.id !== id)
    );
  };

  const updateAttachmentStatus = (id: string, status: UploadStatus, errorMessage?: string) => {
    setAttachments(prev => 
      prev.map(a => a.id === id ? { ...a, status, errorMessage } : a)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const invalidAttachments = attachments.filter(a => !a.guestName.trim());
    if (invalidAttachments.length > 0) {
      setError('Please provide a name for each attachment');
      return;
    }

    if (attachments.length === 0) {
      setError('Please add at least one audio file');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccessMessage('');
    
    setAttachments(prev => prev.map(a => ({ ...a, status: 'pending' as UploadStatus })));
    
    try {
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      let successCount = 0;
      const errors: string[] = [];
      
      for (const attachment of attachments) {
        try {
          updateAttachmentStatus(attachment.id, 'compressing');
          
          const renamedFile = new File(
            [attachment.file], 
            `${attachment.guestName}${attachment.file.name.substring(attachment.file.name.lastIndexOf('.'))}`,
            { type: attachment.file.type }
          );
          
          const formData = new FormData();
          formData.append('audio', renamedFile);
          formData.append('attachmentId', attachment.id);
          formData.append('batchId', batchId);
          formData.append('retreatLeaderName', retreatLeaderName);
          formData.append('recordType', recordType);
          
          updateAttachmentStatus(attachment.id, 'uploading');
          console.log(`Uploading file for guest: ${attachment.guestName}`);
          
          const uploadResponse = await fetch('/api/upload-batch-audio', {
            method: 'POST',
            body: formData,
          });
          
          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json().catch(() => ({ error: 'Unknown error' }));
            updateAttachmentStatus(attachment.id, 'error', errorData.error);
            errors.push(`${attachment.guestName}: ${errorData.error}`);
          } else {
            updateAttachmentStatus(attachment.id, 'success');
            successCount++;
          }
        } catch (error) {
          updateAttachmentStatus(attachment.id, 'error', 'Upload failed');
          errors.push(`${attachment.guestName}: Upload failed`);
        }
      }
      
      if (successCount === attachments.length) {
        setSuccessMessage(`Successfully uploaded ${successCount} file(s) with "${retreatLeaderName}" as the interviewer for ${recordType} records.`);
        setTimeout(() => setAttachments([]), 2000);
      } else if (successCount > 0) {
        setSuccessMessage(`Partially successful: ${successCount} of ${attachments.length} files uploaded.`);
        if (errors.length > 0) {
          setError(`Some uploads failed: ${errors.join(', ')}`);
        }
      } else {
        setError(`All uploads failed: ${errors.join(', ')}`);
      }
      
    } catch (err) {
      setError('Failed to upload files. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddMore = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleReset = () => {
    setAttachments([]);
    setError('');
    setSuccessMessage('');
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      addNewFiles(droppedFiles);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Guest Recordings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Team Member Name</label>
                <input
                  type="text"
                  value={retreatLeaderName === 'Interviewer' ? '' : retreatLeaderName}
                  onChange={(e) => setRetreatLeaderName(e.target.value)}
                  className="w-full p-2 text-sm border rounded"
                  placeholder="Interviewer"
                  onFocus={() => {
                    if (retreatLeaderName === 'Interviewer') {
                      setRetreatLeaderName('');
                    }
                  }}
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium">Record Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="recordType"
                      value="Check-In"
                      checked={recordType === 'Check-In'}
                      onChange={(e) => setRecordType(e.target.value as 'Check-In' | 'Check-Out')}
                      className="mr-2"
                    />
                    Check-In
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="recordType"
                      value="Check-Out"
                      checked={recordType === 'Check-Out'}
                      onChange={(e) => setRecordType(e.target.value as 'Check-In' | 'Check-Out')}
                      className="mr-2"
                    />
                    Check-Out
                  </label>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium">Audio Attachments</label>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleAddMore}
                  size="sm"
                >
                  Add Files
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="audio/*"
                  className="hidden"
                  multiple
                />
              </div>
              
              {attachments.length === 0 && (
                <div 
                  className={`border-2 ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-dashed'} rounded-md p-6 text-center transition-colors duration-200`}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="text-gray-500">
                      {isDragging ? (
                        <p className="font-medium">Drop audio files here</p>
                      ) : (
                        <>
                          <p>Drag and drop audio files here, or click "Add Files"</p>
                          <p className="text-sm">Supports MP3, WAV, M4A, and other audio formats</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {attachments.length > 0 && (
                <div 
                  className="space-y-3 max-h-[400px] overflow-y-auto p-1 border rounded-md"
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  {isDragging && attachments.length > 0 && (
                    <div className="border-2 border-blue-500 bg-blue-50 rounded-md p-4 text-center m-2">
                      <p className="font-medium">Drop to add more audio files</p>
                    </div>
                  )}
                  
                  {attachments.map((attachment) => (
                    <div 
                      key={attachment.id} 
                      className={`border rounded-md p-3 flex flex-col gap-2 transition-colors ${
                        attachment.status === 'success' ? 'bg-green-50 border-green-300' :
                        attachment.status === 'error' ? 'bg-red-50 border-red-300' :
                        attachment.status === 'compressing' || attachment.status === 'uploading' ? 'bg-blue-50 border-blue-300' :
                        ''
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-sm font-medium truncate max-w-[200px]">
                            {attachment.file.name}
                          </span>
                          {attachment.status && (
                            <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                              attachment.status === 'pending' ? 'bg-gray-200 text-gray-600' :
                              attachment.status === 'compressing' ? 'bg-blue-200 text-blue-700' :
                              attachment.status === 'uploading' ? 'bg-blue-300 text-blue-800' :
                              attachment.status === 'success' ? 'bg-green-200 text-green-700' :
                              'bg-red-200 text-red-700'
                            }`}>
                              {attachment.status === 'compressing' && '⏳ Compressing...'}
                              {attachment.status === 'uploading' && '📤 Uploading...'}
                              {attachment.status === 'success' && '✓ Done'}
                              {attachment.status === 'error' && '✕ Failed'}
                              {attachment.status === 'pending' && '⏸ Waiting'}
                            </span>
                          )}
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeAttachment(attachment.id)}
                          disabled={isProcessing}
                        >
                          ✕
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={attachment.guestName}
                          onChange={(e) => handleGuestNameChange(attachment.id, e.target.value)}
                          className="w-full p-2 text-sm border rounded"
                          placeholder="Guest name"
                          required
                          disabled={isProcessing}
                        />
                      </div>
                      {attachment.status === 'error' && attachment.errorMessage && (
                        <p className="text-xs text-red-600">{attachment.errorMessage}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {isProcessing && attachments.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Processing files...</span>
                  <span>
                    {attachments.filter(a => a.status === 'success').length} / {attachments.length} complete
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(attachments.filter(a => a.status === 'success' || a.status === 'error').length / attachments.length) * 100}%` 
                    }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-100 text-red-700 rounded">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-green-100 text-green-700 rounded">
                {successMessage}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={isProcessing || attachments.length === 0}
                className="w-full"
              >
                {isProcessing 
                  ? `Processing ${attachments.filter(a => a.status === 'compressing' || a.status === 'uploading').length > 0 
                      ? attachments.find(a => a.status === 'compressing' || a.status === 'uploading')?.guestName || 'file'
                      : '...'}`
                  : 'Upload to Webhook'
                }
              </Button>
              
              {attachments.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={isProcessing}
                >
                  Clear All
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}