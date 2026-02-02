
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [guestName, setGuestName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !guestName) {
      setError('Please provide both guest name and audio file');
      return;
    }

    setIsProcessing(true);
    setError('');

    const formData = new FormData();
    formData.append('audio', file);
    formData.append('guestName', guestName);

    try {
      const response = await fetch('/api/process-audio', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to process audio');
      
      // Handle success
      setFile(null);
      setGuestName('');
    } catch (err) {
      setError('Failed to process audio. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Guest Audio Upload</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Guest Name</label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Enter guest name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Audio Recording</label>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Upload and Process'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
