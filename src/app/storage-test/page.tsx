
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function StorageTestPage() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const testWithSampleFile = async () => {
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      // Create a sample file
      const blob = new Blob(['Test content'], { type: 'text/plain' });
      const file = new File([blob], 'test.txt', { type: 'text/plain' });

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/test-storage', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload file');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test storage');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Storage Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={testWithSampleFile}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Testing...' : 'Test Storage Upload'}
          </Button>

          {error && (
            <div className="text-red-500 text-sm mt-2">
              Error: {error}
            </div>
          )}

          {result && (
            <div className="mt-4 space-y-2">
              <h3 className="font-semibold">Upload Success!</h3>
              <div className="text-sm">
                <p>File: {result.fileName}</p>
                <a 
                  href={result.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  View File
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
