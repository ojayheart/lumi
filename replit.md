# Overview

This is a real-time voice assistant application built with Next.js that leverages the ElevenLabs Conversational SDK for voice interactions. The application serves as a wellness companion called "Lumi" for Aro Ha retreats, enabling guests to have voice conversations about their wellness goals, dietary restrictions, and retreat preferences. The system transcribes audio conversations, analyzes them using Google's Gemini AI, and stores guest profiles in Airtable for retreat personalization.

The application features both real-time voice chat capabilities and batch audio processing functionality for retreat leaders to process multiple guest conversations efficiently.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: Next.js 15.5.11 with React 19 and TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components for consistent UI design
- **Voice Integration**: ElevenLabs React SDK (@11labs/react) for real-time conversational AI
- **Client-side Logic**: Dynamic form validation and voice permission handling with client-side only rendering for voice components

## Backend Architecture
- **API Routes**: Next.js App Router API routes for audio processing and batch operations
- **Audio Processing Pipeline**: 
  - Audio transcription via ElevenLabs Speech-to-Text API
  - AI analysis using Google Gemini AI for extracting guest preferences and wellness goals
  - Structured data storage in Airtable
- **File Management**: Local file system for temporary audio storage during batch processing
- **Queue System**: JSON-based queue management for background processing of multiple audio files

## Data Storage Solutions
- **Primary Database**: Airtable with structured tables for guest profiles, transcripts, and analysis
- **File Storage**: Originally designed for cloud storage integration (Replit Object Storage) but currently using direct Airtable attachments
- **Queue Storage**: Local JSON files in uploads/queue directory for batch processing state management

## Authentication and Authorization
- **API Security**: Environment variable-based API key management for ElevenLabs, Google AI, and Airtable
- **No User Authentication**: Public-facing application designed for guest use without login requirements

# External Dependencies

## Third-party APIs
- **ElevenLabs**: Conversational AI SDK and Speech-to-Text API for voice interactions and transcription
- **Google Generative AI**: Gemini model for analyzing transcripts and extracting structured wellness data
- **Airtable**: Database service for storing guest profiles, transcripts, and retreat preferences

## Cloud Services
- **Deployment**: Configured for Replit hosting with potential Vercel compatibility
- **Storage**: Currently using Airtable for file attachments, with unused Replit Object Storage integration

## Development Dependencies
- **UI Framework**: shadcn/ui component library built on Radix UI primitives
- **Icons**: Lucide React for consistent iconography
- **Styling**: Class variance authority and clsx for dynamic styling
- **Fonts**: Custom Geist and Sagona fonts loaded via Next.js font optimization