
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestAgentPage() {
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>ElevenLabs Configuration Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="font-medium">Agent ID:</label>
              <p className="text-sm text-gray-600 break-all">
                {agentId || "Not configured"}
              </p>
            </div>
            <div>
              <label className="font-medium">Status:</label>
              <p className={`text-sm ${agentId ? 'text-green-600' : 'text-red-600'}`}>
                {agentId ? "Configured ✓" : "Missing ✗"}
              </p>
            </div>
            {!agentId && (
              <div className="p-3 bg-yellow-50 text-yellow-800 rounded text-sm">
                Please add NEXT_PUBLIC_ELEVENLABS_AGENT_ID to your environment variables
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
