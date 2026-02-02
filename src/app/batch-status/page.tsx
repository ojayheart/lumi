
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type BatchStatus = {
  batchId: string;
  status: string;
  itemCount: number;
  completedCount: number;
  failedCount: number;
  processingCount: number;
  items: Array<{
    attachmentId: string;
    status: string;
    createdAt: string;
    completedAt?: string;
    error?: string;
  }>;
};

export default function BatchStatusPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen flex-col items-center justify-center p-4">Loading...</div>}>
      <BatchStatusContent />
    </Suspense>
  );
}

function BatchStatusContent() {
  const searchParams = useSearchParams();
  const [batchId, setBatchId] = useState<string>(searchParams.get('batchId') || '');
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // Function to fetch batch status
  const fetchBatchStatus = async () => {
    if (!batchId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/check-batch-status?batchId=${batchId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch batch status');
      }
      
      const data = await response.json();
      setBatchStatus(data);
    } catch (err) {
      setError('Error fetching batch status');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh if enabled and batch is still processing
  useEffect(() => {
    if (!autoRefresh || !batchStatus || 
        batchStatus.status === 'completed' || 
        batchStatus.status === 'completed_with_errors') {
      return;
    }
    
    const interval = setInterval(() => {
      fetchBatchStatus();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, batchStatus, batchId]);

  // Initial fetch when batchId is provided
  useEffect(() => {
    if (batchId) {
      fetchBatchStatus();
    }
  }, [batchId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBatchStatus();
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Batch Processing Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              placeholder="Enter Batch ID"
              className="flex-1 p-2 border rounded"
            />
            <Button type="submit" disabled={loading || !batchId}>
              {loading ? 'Loading...' : 'Check Status'}
            </Button>
          </form>
          
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
          
          {batchStatus && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Batch: {batchStatus.batchId}</h3>
                <div className="flex items-center gap-2">
                  <label className="text-sm">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="mr-1"
                    />
                    Auto-refresh
                  </label>
                  <Button size="sm" variant="outline" onClick={fetchBatchStatus}>
                    Refresh
                  </Button>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className="text-2xl font-semibold">{batchStatus.itemCount}</div>
                    <div className="text-sm text-gray-500">Total</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-green-600">{batchStatus.completedCount}</div>
                    <div className="text-sm text-gray-500">Completed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-yellow-600">{batchStatus.processingCount}</div>
                    <div className="text-sm text-gray-500">Processing</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-red-600">{batchStatus.failedCount}</div>
                    <div className="text-sm text-gray-500">Failed</div>
                  </div>
                </div>
                
                <div className="mt-3">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500"
                      style={{ 
                        width: `${batchStatus.itemCount > 0 
                          ? (batchStatus.completedCount / batchStatus.itemCount * 100) 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
                
                <div className="mt-2 text-center">
                  <span className={`inline-block px-2 py-1 text-xs rounded ${
                    batchStatus.status === 'completed' ? 'bg-green-100 text-green-800' :
                    batchStatus.status === 'completed_with_errors' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {batchStatus.status === 'completed' ? 'Completed' :
                     batchStatus.status === 'completed_with_errors' ? 'Completed with Errors' :
                     'In Progress'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Processing Details</h3>
                <div className="max-h-[300px] overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {batchStatus.items.map(item => (
                        <tr key={item.attachmentId}>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                            {item.attachmentId.substring(0, 8)}...
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              item.status === 'completed' ? 'bg-green-100 text-green-800' :
                              item.status === 'failed' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                            {new Date(item.createdAt).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                            {item.completedAt ? new Date(item.completedAt).toLocaleString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
