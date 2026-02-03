"use client";

import React, { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useConversation, type DisconnectionDetails, type Status } from "@elevenlabs/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";

interface VoiceChatProps {
  firstName: string;
  lastName: string;
  email: string;
}

const VoiceChatComponent = ({ firstName, lastName, email }: VoiceChatProps) => {
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const conversation = useConversation({
    onConnect: () => {
      setErrorMessage("");
      setIsConnecting(false);
    },
    onDisconnect: (details: DisconnectionDetails) => {
      setIsConnecting(false);
      if (details.reason === "error") {
        setErrorMessage("Connection lost unexpectedly. Please try again.");
      }
    },
    onStatusChange: ({ status }: { status: Status }) => {
      if (status === "connecting") {
        setIsConnecting(true);
      }
    },
    onError: (error: string | Error) => {
      const errorMsg = typeof error === "string" ? error : error.message;
      setIsConnecting(false);

      if (errorMsg.includes("microphone") || errorMsg.includes("permission") || errorMsg.includes("getUserMedia")) {
        setErrorMessage("Microphone access denied. Please allow microphone access and refresh the page.");
      } else {
        setErrorMessage(errorMsg);
      }
    },
    textOnly: false,
    preferHeadphonesForIosDevices: true,
  });

  const { status, isSpeaking } = conversation;

  const createAirtableRecord = useCallback(async (conversationId: string) => {
    const userEmail = email || "guest@aroha.com";

    try {
      const response = await fetch('/api/create-conversation-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, firstName, lastName, email: userEmail }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to create Airtable record:", errorText);
      }
    } catch (error) {
      console.error("Error creating Airtable record:", error);
    }
  }, [email, firstName, lastName]);

  const handleStartConversation = async () => {
    setErrorMessage("");

    // Track analytics event
    if (typeof window !== 'undefined' && (window as unknown as { plausible?: (event: string, options?: { props: Record<string, string> }) => void }).plausible) {
      (window as unknown as { plausible: (event: string, options?: { props: Record<string, string> }) => void }).plausible('Start Conversation', {
        props: {
          user_type: email ? 'known_user' : 'guest',
          has_name: firstName ? 'yes' : 'no'
        }
      });
    }

    try {
      if (!process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID) {
        throw new Error("ElevenLabs Agent ID not configured");
      }

      setIsConnecting(true);

      const conversationId = await conversation.startSession({
        agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID,
        connectionType: "webrtc",
        dynamicVariables: {
          UserName: firstName.trim()
        }
      });

      // Create Airtable record in background (don't block conversation)
      createAirtableRecord(conversationId);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to start conversation";
      setErrorMessage(errorMsg);
      setIsConnecting(false);
    }
  };

  const handleEndConversation = async () => {
    try {
      await conversation.endSession();
    } catch (error) {
      setErrorMessage("Failed to end conversation");
    }
  };

  const toggleMute = async () => {
    try {
      await conversation.setVolume({ volume: isMuted ? 1 : 0 });
      setIsMuted(!isMuted);
    } catch (error) {
      setErrorMessage("Failed to change volume");
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Voice Chat
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleMute}
              disabled={status !== "connected"}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-center">
            {status === "connected" ? (
              <Button
                variant="destructive"
                onClick={handleEndConversation}
                className="w-full"
              >
                <MicOff className="mr-2 h-4 w-4" />
                End Conversation
              </Button>
            ) : (
              <Button
                onClick={handleStartConversation}
                disabled={isConnecting}
                className="w-full"
              >
                <Mic className="mr-2 h-4 w-4" />
                {isConnecting ? "Connecting..." : "Start Conversation"}
              </Button>
            )}
          </div>

          <div className="text-center text-sm">
            {status === "connected" && (
              <p className="text-green-600">
                {isSpeaking ? "Agent is speaking..." : "Listening for your voice..."}
              </p>
            )}
            {errorMessage && <p className="text-red-500">{errorMessage}</p>}
            {(status === "connecting" || isConnecting) && (
              <p className="text-blue-600">Connecting to Lumi...</p>
            )}
            {status === "disconnected" && !isConnecting && (
              <p className="text-yellow-600">
                Click &quot;Start Conversation&quot; and allow microphone access when prompted
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Dynamic import prevents SSR - handles hydration automatically
const VoiceChat = dynamic(() => Promise.resolve(VoiceChatComponent), {
  ssr: false,
  loading: () => (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Voice Chat</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center">Loading voice chat...</div>
      </CardContent>
    </Card>
  )
});

export default VoiceChat;
