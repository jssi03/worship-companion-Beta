# Worship Companion Beta

A church music-learning and worship-songbook platform.

## Structure
- frontend: Next.js website
- backend: FastAPI audio-analysis API
- database/migrations: Supabase schema and access policies
- docs: architecture and roadmap

## Local development

Frontend:
```bash
cd frontend
npm install
npm run dev
```

Backend:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Current limitations
The current audio analysis is a baseline librosa chroma/template estimator for major/minor triads. It is experimental, not reliable full-song transcription. Musician review is required. YouTube/Spotify links are references and do not provide raw audio for analysis. Use only audio you are authorised to process.

Never commit secrets or .env files.


## Song import and analysis capabilities

### YouTube references
- The frontend embeds a supplied YouTube URL and calls `GET /v1/sources/youtube/inspect` to retrieve public oEmbed metadata (title, channel name, thumbnail).
- Metadata inspection does not retrieve captions or audio.
- Official YouTube caption-track download requires OAuth credentials for a channel owner/editor with permission to edit that video. Public third-party artist videos are not assumed to be accessible.
- Do not use unofficial downloaders, scraping, or audio extraction from YouTube. Use an authorised audio file or licensed provider for audio analysis.

### Authorised audio
- `POST /v1/audio/analyse` estimates key, tempo and chord events. This remains an experimental baseline and must be reviewed.
- `POST /v1/audio/transcribe` creates draft lyric text and timestamped segments from an authorised audio upload using optional faster-whisper.
- Install optional transcription dependencies from the backend directory with `pip install -r requirements-transcription.txt`. Configure `WHISPER_MODEL`, `WHISPER_DEVICE`, and `WHISPER_COMPUTE_TYPE` as appropriate for the host.
- Speech recognition of singing is imperfect, particularly with melisma, backing vocals, repeated phrases, and mixed Tamil/English. Treat output as editable draft lyrics, not verified lyrics.

### Deployment requirements
- Deploy the FastAPI backend separately from the Vercel frontend.
- Set Vercel environment variable `NEXT_PUBLIC_ANALYSIS_API_URL` to the deployed HTTPS backend URL.
- Set backend `ALLOWED_ORIGINS` to the exact Vercel production origin(s).
- The current implementation does not yet complete Google OAuth or fetch YouTube caption tracks. That requires creating a Google Cloud project, enabling YouTube Data API v3, configuring OAuth consent and redirect URIs, and securely storing/refreshing channel-owner tokens server-side. Do not put client secrets or refresh tokens in frontend code or GitHub.
