# Aro Ha Lumi Infrastructure Audit

**Date:** 2026-02-03
**Purpose:** Full system documentation for redesign planning

---

## Executive Summary

Lumi is an AI voice assistant for Aro Ha Wellness Retreat guest pre-arrival forms. The current system spans multiple platforms (Replit, Make.com, ElevenLabs, Airtable, Gemini) and needs consolidation for Vercel deployment.

### Completed Work
- [x] Upgraded ElevenLabs SDK 0.6.2 → 0.13.0
- [x] Removed Replit artifacts and dependencies
- [x] Fixed hardcoded Airtable table ID → env var
- [x] Pushed to GitHub: https://github.com/ojayheart/lumi

### Pending Issues
- [ ] ffmpeg won't work on Vercel serverless
- [ ] Make.com middleman adds latency/cost
- [ ] Consolidate with other chatbot (TBD)
- [ ] Deploy to Vercel (currently on Replit)

---

## Current Architecture

### 1. Lumi Web App (Next.js)

**Repository:** https://github.com/ojayheart/lumi

**Tech Stack:**
- Next.js 16.1.6 + React 19 + TypeScript
- ElevenLabs React SDK 0.13.0 (WebRTC)
- Airtable SDK
- Tailwind CSS + shadcn/ui

**Pages:**
| Route | Purpose |
|-------|---------|
| `/` | Main guest form + voice chat |
| `/guest-profile` | Staff batch audio upload |
| `/test-agent` | ElevenLabs config checker |

**API Routes:**
| Route | Purpose |
|-------|---------|
| `/api/create-conversation-record` | Creates stub record in Airtable when conversation starts |
| `/api/upload-batch-audio` | Compresses audio (ffmpeg) and sends to Make.com webhook |
| `/api/setup-airtable` | Connection test |
| `/api/test-airtable-auth` | Auth verification |

**Environment Variables Required:**
```env
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=xxx
AIRTABLE_API_KEY=xxx
AIRTABLE_BASE_ID=appnNWO7ArRjVGM2E
AIRTABLE_TABLE_ID=tblxMiNyQqEFNIRdY
GUEST_PROFILE_WEBHOOK_URL=xxx  # Make.com webhook
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=xxx  # Optional analytics
```

---

### 2. ElevenLabs Agent

**Agent ID:** Configured via `NEXT_PUBLIC_ELEVENLABS_AGENT_ID`

**Purpose:** Voice AI that conducts pre-arrival wellness check-in, collecting:
- Personal info (name, DOB, gender, occupation)
- Contact details (address, phone, email)
- Medical history (conditions, allergies, blood pressure, cardiac, epilepsy)
- Emergency contacts
- Retreat preferences

**Trigger:** Webhook fires when conversation ends, sending `conversation_id` to Make.com

---

### 3. Make.com Scenarios

#### Scenario 1: "ELEVENLABS LUMI CHECK IN" (ID: 3733616)

**Trigger:** Webhook from ElevenLabs (conversation end)

**Flow:**
```
1. gateway:CustomWebHook          - Receives conversation_id
2. elevenlabs:universal (GET)     - Fetch /v1/convai/conversations/{id}
3. elevenlabs:universal (GET)     - Fetch /v1/convai/conversations/{id}/audio
4. builtin:BasicFeeder            - Process conversation data
5. util:TextAggregator            - Aggregate text
6. gemini-ai:createACompletion    - Analyze conversation, extract structured data
7. regexp:AdvancedParser          - Parse Gemini response
8. json:ParseJSON                 - Convert to JSON
9. airtable:ActionSearchRecords   - Check if guest exists
10. builtin:BasicRouter           - Route: new guest / existing / error
11. airtable:ActionCreateRecord   - Create new record (30+ fields)
    OR airtable:ActionUpdateRecords - Update existing
12. gemini-ai:createACompletion   - Generate email summary
13. email:ActionSendEmail         - Send to retreat@aro-ha.com
```

**Output:** Full guest record in LUMI CHECKIN ENTRIES + email notification

---

#### Scenario 2: "Audio Transcription Guest Profiles" (ID: 4280231)

**Trigger:** Webhook from `/api/upload-batch-audio`

**Flow:**
```
1. gateway:CustomWebHook          - Receives audio file + metadata
2. gemini-ai:uploadAFile          - Upload audio to Gemini
3. gemini-ai:createACompletion    - Transcribe + analyze with prompt:
   "Extract The Entire Transcript and all required information for JSON:
    - Name, Audio Recording, Transcript, Analysis
    - Guest Profile, Health Goals, Dietary Restrictions
    - Interests, Recommended Services"
4. airtable:ActionCreateRecord    - Create in Guest Profiles table
```

**Output:** Guest profile record with transcript and AI analysis

---

### 4. Airtable Structure

**Base ID:** `appnNWO7ArRjVGM2E`
**API Token:** (stored in 1Password / env vars - do not commit)

#### Table: LUMI CHECKIN ENTRIES
**ID:** `tblxMiNyQqEFNIRdY`
**Purpose:** Voice check-in data from main Lumi flow

| Field | Type | Field ID |
|-------|------|----------|
| Name | multilineText | fldquhqY2zMOAazqq |
| First name | multilineText | fld4U8k0UhqPZLCts |
| Last Name | singleLineText | fldIXuXMP7CB728dO |
| Retreat Date | multilineText | fldJhosrsMGpbzUlP |
| City | singleLineText | fldQCM8kZFiPHrU14 |
| Address | multilineText | fldjtisBrpATavilO |
| Country | multilineText | fldCDknmG6BGXTPPS |
| phone number | singleLineText | fldskfkyhbtxpFVMd |
| email | singleLineText | fldzh7KHuUF5wKXHi |
| DOB | multilineText | fldwdcxs1hLwRR3SW |
| Gender | singleLineText | fld8nc99kaUPcZd8x |
| Age | number | fldmOmaIe4Y057mCj |
| Height | number | fldQbRTpBXuA0HpB0 |
| Have you been here before? | multilineText | fldYmwfZnKKLZpTKh |
| Medical Condition(s) | multilineText | fld1CMg5gOHPjm1T3 |
| Allergies | multilineText | fldjeccY3Qsrcu520 |
| Intolerances | multilineText | fldYuKU0RZVwWs47z |
| Additional needs? | multilineText | fldcBzEcf2xdWPctx |
| Emergency Contact Name | multilineText | fldEKN7IoAXDdgMjO |
| Emergency Contact phone | multilineText | fldSitXg0zspi4tNz |
| Emergency Contact Relation | multilineText | fldfV9puRWZtzaPfM |
| How did you hear about us | multilineText | fldHtVjEGqjjLE3AD |
| Do you have high blood pressure? | multilineText | fldHUqrUoHDeBvr4B |
| Are you epileptic or prone to seizures? | multilineText | fldg4MuX9JzW49XWO |
| Do you have a cardiac condition? | multilineText | fld0K4LGsJTPXg6vN |
| Have you lost consciousness or fell over as a result of dizziness? | multilineText | fldXLPGNTm5IrD41e |
| Occupation | multilineText | fldl2yUMHhHjeFtxo |
| Rate your level of stress over the last six months? | number | fldRiXV77s9rMr7kK |
| Photo Permission | checkbox | fldtHlxcS01GZX4tF |
| Share Email with Group | checkbox | fldMWj5xk32cfeilu |
| Add To Aro Ha Lists | checkbox | fldcCkxYgNsQX91ph |
| Sync to Active Campaign | multilineText | fldPG8ns2fgBX6cfK |
| RecordID | multilineText | fldmDEhuFYphMKoOD |
| conversation_id | singleLineText | fldqVeQshSZRgl5Og |
| Full Transcript | multilineText | fldQo3lnwPs7xpUUp |
| Created | createdTime | fldVgJqE1RzbEmElH |

---

#### Table: Guest Profiles
**ID:** `tblNUhkqNOJqgfBjs`
**Purpose:** Staff-uploaded audio profiles

| Field | Type |
|-------|------|
| Name | singleLineText |
| Audio Recording | url |
| Transcript | multilineText |
| Analysis | multilineText |
| Guest Profile | multilineText |
| Health Goals | multilineText |
| Dietary Restrictions | multilineText |
| Interests | multilineText |
| Recommended Services | multilineText |
| audio | multipleAttachments |
| Created Date | createdTime |
| Retreat Leader | singleLineText |
| Type | singleLineText |

---

#### Table: LUMI WEB LEADS
**ID:** `tblzjSaOCjIP8K5dF`
**Purpose:** Basic web leads

| Field | Type |
|-------|------|
| name | singleLineText |
| email | singleLineText |
| phone number | singleLineText |
| retreat date | singleLineText |
| notes | singleLineText |
| first name | singleLineText |
| last name | singleLineText |
| transcript | multilineText |
| source | singleLineText |
| Created | createdTime |

---

#### Other Tables in Base
- Emails (tblWbKx7XLeiAXmcR) - FAQ/support emails
- Website (tblyRZvQzUY7HuSm5) - Website content
- Questions (tbl5ml177JepTjmGy) - Q&A pairs
- Documents (tblOtwO7Ci5I70fNp) - PDF uploads
- Images (tbljIVt6J7PQpJ9FR) - Image assets
- Bug reporting (tblNzdbtkQomVosSl) - Bug reports
- Tracking (tblCJBXw6FmHVbySL) - Event tracking
- AI Prompts (tblZeS1nO4noLwx7s) - Stored prompts
- Transcripts (tblpv6thqTtKqtFqI) - Conversation transcripts

---

## Data Flow Diagrams

### Flow 1: Voice Check-In
```
Guest Browser                 ElevenLabs              Make.com                 Airtable
     │                            │                      │                        │
     │─── Enter name/email ──────▶│                      │                        │
     │                            │                      │                        │
     │◀── Voice conversation ────▶│                      │                        │
     │    (WebRTC, ~30 questions) │                      │                        │
     │                            │                      │                        │
     │─── POST /api/create... ───────────────────────────────────────────────────▶│
     │    (stub record)           │                      │                        │
     │                            │                      │                        │
     │    [Conversation ends]     │                      │                        │
     │                            │─── Webhook ─────────▶│                        │
     │                            │    (conversation_id) │                        │
     │                            │                      │─── GET conversation ──▶│
     │                            │◀─────────────────────│    data + audio        │
     │                            │                      │                        │
     │                            │                      │─── Gemini analyze ────▶│
     │                            │                      │◀── Structured JSON ────│
     │                            │                      │                        │
     │                            │                      │─── Upsert record ─────▶│
     │                            │                      │                        │
     │                            │                      │─── Email to staff ────▶│
```

### Flow 2: Staff Audio Upload
```
Staff Browser                Next.js API              Make.com                 Airtable
     │                            │                      │                        │
     │─── Upload audio files ────▶│                      │                        │
     │    + guest names           │                      │                        │
     │                            │─── ffmpeg compress ──│                        │
     │                            │    (64kbps MP3)      │                        │
     │                            │                      │                        │
     │                            │─── POST webhook ────▶│                        │
     │                            │    (audio + metadata)│                        │
     │                            │                      │─── Upload to Gemini ──▶│
     │                            │                      │◀── Transcribe + JSON ──│
     │                            │                      │                        │
     │                            │                      │─── Create record ─────▶│
     │◀── Success response ───────│◀─────────────────────│                        │
```

---

## Problems Identified

### Critical
1. **ffmpeg on Vercel** - `audio-compression.ts` uses `spawn('ffmpeg')` which won't work on serverless

### High Priority
2. **Make.com dependency** - Extra latency (~2-5s), monthly cost, single point of failure
3. **Two disconnected tables** - Voice check-ins vs staff uploads not linked

### Medium Priority
4. **No real-time feedback** - Users don't see transcript/analysis
5. **Duplicate data entry** - Some fields overlap between tables

### Low Priority
6. **Console.log in production** - Some routes still have debug logging

---

## Proposed Solutions (To Be Designed)

### Option A: Eliminate Make.com Entirely
- Move all logic to Next.js API routes
- Use Vercel background functions for heavy processing
- Call Gemini API directly
- Use ElevenLabs webhooks → Vercel endpoint

### Option B: Hybrid Approach
- Keep Make.com for complex orchestration
- Move audio processing to dedicated service (e.g., Cloudinary, AWS Lambda)
- Simplify Next.js to just UI

### Option C: Full Redesign
- Consolidate tables
- Add real-time updates (WebSocket/polling)
- Unified guest profile model
- Browser-side audio compression

---

## Other Systems to Consolidate

### Lumi-Web (Embeddable Chatbot Widget)

**Repository:** https://github.com/ojayheart/lumi-web
**Current Deployment:** https://arohaunifiedchat.replit.app (Replit)

**Tech Stack:**
- Express.js + Vite (full-stack)
- ElevenLabs SDK 0.1.3 (OUTDATED - same issue)
- Voiceflow for conversation flows
- OpenAI GPT-4o for text processing
- Clerk for authentication
- Neon Postgres + Drizzle ORM (local storage)
- WebSocket support

**Purpose:** Embeddable AI chatbot widget for Aro Ha website (Webflow)

**Key Features:**
- Dual-mode: Voice + Text chat
- Lead capture forms
- Lead magnet prompts
- Transcript tracking with summaries
- Knowledge gap flagging
- Admin panel + Analytics
- Mobile-optimized with safe area support
- Multiple embed scripts for different platforms

**API Integrations:**
| Service | Purpose |
|---------|---------|
| Voiceflow | Conversation flow engine |
| ElevenLabs | Voice synthesis (Deobra voice) |
| OpenAI | Text normalization, summaries |
| Airtable | Lead storage |

**Airtable Tables Used:**
- `LUMI WEB LEADS` (tblzjSaOCjIP8K5dF) - Lead capture
- `Questions` (tbl5ml177JepTjmGy) - Knowledge gaps/FAQ

**Database Schema (Postgres):**
- `transcripts` - Conversation sessions
- `messages` - Individual messages
- `leads` - Captured lead info
- `lead_magnets` - Downloadable resources

**Embed Usage:**
```html
<script src="https://arohaunifiedchat.replit.app/embed.js"></script>
```

**Environment Variables:**
```env
VOICEFLOW_API_KEY=xxx
ELEVENLABS_API_KEY=xxx
OPENAI_API_AROHA_KEY=xxx
AIRTABLE_API_KEY=xxx
DATABASE_URL=xxx  # Neon Postgres
CLERK_SECRET_KEY=xxx
```

---

## System Overlap Analysis

| Capability | lumi (voice check-in) | lumi-web (chatbot) |
|------------|----------------------|-------------------|
| Voice AI | ElevenLabs Agent | ElevenLabs + Voiceflow |
| Text Chat | No | Yes |
| Lead Capture | Yes (Airtable) | Yes (Postgres + Airtable) |
| Transcripts | Via Make.com | Native |
| Analytics | Plausible | Built-in admin |
| Embedding | Standalone page | Widget embed |
| Mobile | Basic | Optimized |

**Duplicate Functionality:**
1. Both use ElevenLabs (different SDKs, different agents)
2. Both write to same Airtable base (different tables)
3. Both capture leads
4. Both track conversations

**Consolidation Opportunities:**
1. Unified voice/text interface
2. Single ElevenLabs integration (upgraded SDK)
3. Merged lead capture pipeline
4. Single deployment target (Vercel)

---

## Resources

### Repositories
- Lumi: https://github.com/ojayheart/lumi

### Make.com Scenarios
- Scenario 1 (Voice): ID 3733616
- Scenario 2 (Audio): ID 4280231

### API Keys (DO NOT COMMIT)
- ElevenLabs Agent ID: env var `NEXT_PUBLIC_ELEVENLABS_AGENT_ID`
- Airtable Token: `patqmrfxNwQPRxZl9...` (truncated)
- Airtable Base: `appnNWO7ArRjVGM2E`

---

## Next Steps

1. [ ] Document additional chatbot system
2. [ ] Design consolidated architecture
3. [ ] Decide on audio processing solution
4. [ ] Create migration plan
5. [ ] Implement and test
6. [ ] Deploy to Vercel
