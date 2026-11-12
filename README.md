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
