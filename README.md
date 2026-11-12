# Worship Companion Beta

A private church music-learning and worship-songbook platform.

## Project structure

- `frontend/` — Next.js responsive web application (next milestone)
- `backend/` — Python FastAPI audio-analysis service
- `database/migrations/` — Supabase/PostgreSQL schema
- `docs/` — architecture and implementation notes

## Product principles

1. AI-generated music analysis is labelled as an estimate until reviewed.
2. Shared church arrangements are never silently overwritten by personal edits.
3. Users can maintain private and shared songbooks.
4. Audio is processed only when the user has rights or permission to upload it.
5. Streaming links are playback/metadata references; they do not grant raw audio access.

## Development status

Initial project architecture scaffold. Production chord recognition, lyrics transcription, authentication and deployment are not yet implemented.
