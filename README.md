# VideoTutor

**Watch. Ask. Understand.**

VideoTutor is an AI learning assistant for YouTube educational videos. Paste a
YouTube URL, watch the video, and ask questions about what the speaker is
explaining at any moment. VideoTutor captures the exact playback timestamp,
pulls the surrounding transcript, and asks Google Gemini to answer using that
context -- not as a generic chatbot, but as a tutor grounded in exactly what
was said.

---

## Features

- Paste any YouTube URL and get a real embedded player (official YouTube
  IFrame Player API -- no downloading or re-hosting of video)
- Real transcript extraction, with graceful handling of videos that have no
  transcript
- Ask a question at any point in the video; the exact player timestamp
  (`player.getCurrentTime()`) is captured the instant you hit send
- Timestamp-based context retrieval (±60s around the question) sent to
  Gemini -- no vector DB, no embeddings, cheap and predictable for V1
- Short-term conversation memory (follow-up questions understand what you
  asked before), capped to control token usage
- Gemini API key lives only on the backend -- never sent to the browser,
  never in the JS bundle
- Friendly error handling for invalid URLs, missing transcripts, private/
  deleted videos, Gemini quota errors, and network failures
- Responsive layout: video + chat side-by-side on desktop, stacked on mobile
- Docker support for both services

---

## Architecture

```
Browser
   |
   | HTTPS
   v
React Frontend (Vite + TypeScript + Tailwind)
   |
   | REST API
   v
FastAPI Backend
   |
   +-- Transcript Service        (youtube-transcript-api, isolated & cached)
   |
   +-- Timestamp Context Service (±60s window around the question)
   |
   +-- Gemini Service            (google-genai SDK, the only module that
   |                              talks to Gemini)
   v
Google Gemini API
```

The browser never talks to Gemini directly. Only `backend/app/services/
gemini_service.py` holds the API key, read from an environment variable.

---

## Tech Stack

**Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router, Lucide
React, YouTube IFrame Player API

**Backend:** Python, FastAPI, Pydantic, Uvicorn

**AI:** Google Gemini API via the official `google-genai` SDK (model name is
fully configurable via `GEMINI_MODEL` -- never hardcoded)

**Transcript:** `youtube-transcript-api`, wrapped in a dedicated service so
the extraction mechanism can be swapped later without touching the AI layer

**Database:** None required for V1. The code is structured so PostgreSQL can
be added later without a redesign.

---

## Folder Structure

```
videotutor/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/routes/{health,video,chat}.py
│   │   ├── services/
│   │   │   ├── transcript_service.py
│   │   │   ├── transcript_context_service.py
│   │   │   ├── gemini_service.py
│   │   │   └── youtube_utils.py
│   │   ├── schemas/{video,chat}.py
│   │   └── core/{config,logging_config}.py
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/  (Navbar, Hero, YouTubeUrlInput, VideoPlayer,
│   │   │                 ChatPanel, ChatMessage, ChatInput, LoadingState,
│   │   │                 ErrorMessage)
│   │   ├── pages/       (HomePage, WorkspacePage)
│   │   ├── services/    (api.ts, youtube.ts)
│   │   ├── hooks/       (useYouTubePlayer.ts, useChat.ts)
│   │   └── types/       (video.ts, chat.ts, transcript.ts)
│   ├── package.json
│   ├── .env.example
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Local Setup

### 1. Get a Gemini API key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Create an API key (the free tier is sufficient for development)
3. Pick a model name available on your account (e.g. `gemini-2.0-flash`)

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# edit .env and set GEMINI_API_KEY and GEMINI_MODEL

uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000`. Visit `http://localhost:8000/docs`
for interactive API docs.

### 3. Frontend

```bash
cd frontend
npm install

cp .env.example .env
# defaults to VITE_API_BASE_URL=http://localhost:8000, which is correct
# for local development

npm run dev
```

Frontend runs at `http://localhost:5173`.

### 4. Verify

- `npm run build` and `npm run preview` should both succeed
- `GET http://localhost:8000/api/health` should return `{"status": "ok"}`
- Paste a YouTube URL with captions on the homepage and confirm the chat
  responds using the video's transcript

---

## Environment Variables

**backend/.env**

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Your Gemini API key. Backend-only, never exposed. |
| `GEMINI_MODEL` | Gemini model name, e.g. `gemini-2.0-flash`. |
| `FRONTEND_ORIGIN` | Allowed CORS origin(s), comma-separated. |
| `PORT` | Port the backend binds to. Defaults to `8000`. |
| `ENVIRONMENT` | `development` or `production`. |
| `MAX_QUESTION_LENGTH` | Max characters per question (default `500`). |
| `MAX_CONVERSATION_HISTORY_MESSAGES` | Messages of history sent to Gemini (default `8`). |
| `TRANSCRIPT_CONTEXT_WINDOW_SECONDS` | Seconds before/after the timestamp to include (default `60`). |

**frontend/.env**

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend URL. `http://localhost:8000` locally, your deployed backend URL in production. |

---

## How It Works

**Transcript extraction** (`transcript_service.py`): given a video ID, fetches
the best available transcript (preferring English, falling back to whatever
is available) via `youtube-transcript-api`, normalizes it into
`{start, duration, text}` segments, and caches it in memory per process so
re-analyzing the same video doesn't repeat the network call.

**Timestamp tracking**: the frontend loads the official YouTube IFrame Player
API. `useYouTubePlayer` wraps it and exposes `getCurrentTime()`. When the user
hits Send, `useChat` calls `getCurrentTime()` at that exact instant -- never a
stale value -- and formats it as `MM:SS` or `HH:MM:SS`.

**Context retrieval**: given the captured timestamp, both the frontend
(`useChat.ts`) and backend (`transcript_context_service.py`) implement the
same simple rule -- take all transcript segments overlapping
`[timestamp - 60s, timestamp + 60s]`, safely narrowing near the start/end of
the video. No embeddings or vector search in V1.

**Gemini request** (`gemini_service.py`): sends a fixed system instruction
(VideoTutor's tutoring persona), the trimmed conversation history, the
timestamped transcript context, and the question. One user question results
in exactly one Gemini call -- nothing is sent while typing or on playback
ticks.

---

## Deployment

### Backend

Any host that runs Python works (Render, Railway, Fly.io, a VM, etc.).

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Or build the provided `backend/Dockerfile`:

```bash
docker build -t videotutor-backend ./backend
docker run -p 8000:8000 --env-file backend/.env videotutor-backend
```

Set `FRONTEND_ORIGIN` to your deployed frontend's exact origin (not `*`) in
production.

### Frontend

Any static host works (Vercel, Netlify, Cloudflare Pages, S3 + CDN, etc.).

```bash
npm run build
# deploy the frontend/dist directory
```

Set `VITE_API_BASE_URL` to your deployed backend's URL at build time. Or use
the provided `frontend/Dockerfile`, which builds and serves the static
bundle via nginx:

```bash
docker build --build-arg VITE_API_BASE_URL=https://your-backend.example.com -t videotutor-frontend ./frontend
docker run -p 5173:80 videotutor-frontend
```

### Both together (local only)

```bash
cp .env.example .env   # fill in GEMINI_API_KEY
docker compose up --build
```

---

## Security Notes

- `GEMINI_API_KEY` is read only in `backend/app/services/gemini_service.py`
  and is never sent to the frontend, logged, or included in the built JS
  bundle (verified during development: the production bundle contains no
  reference to the key or the string "GEMINI").
- CORS is restricted to `FRONTEND_ORIGIN`; do not set this to `*` in
  production.
- Request bodies are validated with Pydantic; question length, history
  length, and transcript context size are all capped to control cost.
- Logs never include the API key, full transcripts, or full conversation
  histories -- only high-level events (request received, success/failure,
  lengths/counts).

---

## Known Limitations (V1)

- No database or persistent accounts -- state lives only in the browser
  session (React state) and an in-process transcript cache that resets on
  backend restart.
- Videos without any available captions/transcript cannot be tutored on;
  the UI surfaces this clearly with a retry option.
- Context retrieval is timestamp-only (±60s), not semantic -- a question
  that references something said much earlier in the video may need the
  user to scrub back before asking.
- No streaming responses -- the chat waits for the full Gemini response.
- Single-session conversation memory only; refreshing the page clears chat
  history (the video and transcript can simply be reloaded).

## Recommended Next Steps (V2)

- Add chunking + embeddings + a vector store, and combine semantic
  similarity with timestamp proximity for hybrid retrieval
- Automatic video summaries, chapter detection, and key-concept extraction
- Persist transcripts and conversations (PostgreSQL), add user accounts and
  learning history
- Streaming Gemini responses for a faster perceived reply
- Redis-backed transcript cache shared across backend instances
