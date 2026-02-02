
"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// ElevenLabs
import { useConversation } from "@elevenlabs/react";

// UI
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
  const [isClient, setIsClient] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Initialize conversation hook with proper microphone config
  const conversation = useConversation({
    onConnect: () => {
      console.log("Connected to ElevenLabs with microphone access");
      setErrorMessage(""); // Clear any previous errors
      setIsConnecting(false);
    },
    onDisconnect: () => {
      console.log("Disconnected from ElevenLabs");
    },
    onMessage: (message) => {
      console.log("Received message:", message);
    },
    onError: (error: string | Error) => {
      const errorMsg = typeof error === "string" ? error : error.message;
      console.error("ElevenLabs Error:", error);
      
      // Handle microphone permission errors specifically
      if (errorMsg.includes("microphone") || errorMsg.includes("permission") || errorMsg.includes("getUserMedia")) {
        setErrorMessage("Microphone access denied. Please allow microphone access and refresh the page.");
      } else {
        setErrorMessage(errorMsg);
      }
    },
    textOnly: false, // Enable voice conversation (required for microphone)
    preferHeadphonesForIosDevices: true, // Better audio on iOS devices
  });

  const { status, isSpeaking } = conversation;

  useEffect(() => {
    // Mark as client-side only after mount
    setIsClient(true);
  }, []);



  const handleStartConversation = async () => {
    if (!isClient) {
      setErrorMessage("Component not ready. Please refresh the page.");
      return;
    }

    // Track the button click event (privacy-compliant - no personal data)
    if (typeof window !== 'undefined' && (window as any).plausible) {
      (window as any).plausible('Start Conversation', {
        props: { 
          user_type: email ? 'known_user' : 'guest',
          has_name: firstName ? 'yes' : 'no'
        }
      });
    }

    setErrorMessage(""); // Clear previous errors
    console.log("🎤 START CONVERSATION BUTTON CLICKED");
    
    try {
      // Let ElevenLabs SDK handle microphone permission directly
      console.log("🎤 Starting ElevenLabs session (SDK will prompt for microphone)...");
      
      // Use the email for record keeping
      const userEmail = email || "guest@aroha.com";
      
      console.log("Starting conversation with email:", userEmail);
      
      // Check if agent ID is available
      if (!process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID) {
        throw new Error("ElevenLabs Agent ID not configured");
      }
      
      console.log("Starting conversation with configured agent");
      console.log("🚀 Starting ElevenLabs session...");
      setIsConnecting(true);

      const conversationId = await conversation.startSession({
        agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID,
        connectionType: "webrtc", // Use WebRTC for better audio quality
        dynamicVariables: {
          UserName: firstName.trim() // Send the user's first name to personalize the conversation
        }
      });
      
      console.log("Started conversation with ID:", conversationId);
      
      // Create a record in Airtable with the conversation ID and email
      try {
        console.log("Making API call with data:", { conversationId, firstName, lastName, email: userEmail });
        
        const response = await fetch('/api/create-conversation-record', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId,
            firstName,
            lastName,
            email: userEmail
          }),
        });
        
        console.log("Response status:", response.status, response.statusText);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Response not OK:", errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log("Response data:", data);
        
        if (data.success) {
          console.log("Created Airtable record for conversation:", data.recordId);
        } else {
          console.error("Failed to create Airtable record:", data.error);
          if (data.details) {
            console.error("Error details:", data.details);
          }
        }
      } catch (airtableError) {
        console.error("Error creating Airtable record:", airtableError);
        if (airtableError instanceof Error) {
          console.error("Error details:", {
            message: airtableError.message,
            stack: airtableError.stack,
            name: airtableError.name
          });
        }
        // Don't fail the whole conversation for Airtable errors
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to start conversation";
      setErrorMessage(errorMsg);
      console.error("Error starting conversation:", error);
    }
  };

  const handleEndConversation = async () => {
    try {
      await conversation.endSession();
    } catch (error) {
      setErrorMessage("Failed to end conversation");
      console.error("Error ending conversation:", error);
    }
  };

  const toggleMute = async () => {
    try {
      await conversation.setVolume({ volume: isMuted ? 1 : 0 });
      setIsMuted(!isMuted);
    } catch (error) {
      setErrorMessage("Failed to change volume");
      console.error("Error changing volume:", error);
    }
  };

  // Show loading state until client-side is ready
  if (!isClient) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Voice Chat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">Initializing...</div>
        </CardContent>
      </Card>
    );
  }

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
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
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
                disabled={!isClient || isConnecting}
                className="w-full"
              >
                <Mic className="mr-2 h-4 w-4" />
                {isConnecting ? "Connecting..." : "Start Conversation"}
              </Button>
            )}
          </div>

          <div className="text-center text-sm">
            {status === "connected" && (
              <div>
                <p className="text-green-600">
                  {isSpeaking ? "🎤 Agent is speaking..." : "👂 Listening for your voice..."}
                </p>
              </div>
            )}
            {errorMessage && <p className="text-red-500">{errorMessage}</p>}
            {(status === "connecting" || isConnecting) && (
              <p className="text-blue-600">
                Connecting to Lumi...
              </p>
            )}
            {status === "disconnected" && !isConnecting && (
              <p className="text-yellow-600">
                Click "Start Conversation" and allow microphone access when prompted
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Use dynamic import to prevent SSR and eliminate hydration issues
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
