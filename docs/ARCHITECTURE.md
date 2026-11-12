# Architecture

- GitHub: source control.
- Next.js: responsive user interface.
- Supabase: authentication, PostgreSQL and private object storage.
- FastAPI: audio processing API.

## Audio analysis
The current service uses librosa chroma features and major/minor triad templates for baseline time-local chord estimates. This is experimental, not production transcription. Inversions, slash chords, seventh/suspended chords, dense arrangements and key changes may be misidentified. Confidence is heuristic, not calibrated probability. Human review is required.

A future model should add trained polyphonic chord recognition, beat-aware smoothing, bass/stem evidence, alternate candidates and a correction workflow.

## Songbook access
Private arrangements belong to one user. Church arrangements belong to a church and are readable by its members. Shared edits require admin/editor roles. Personal corrections should not overwrite shared versions. Membership must be granted by a trusted admin/invitation workflow.

## Streaming links
A YouTube or Spotify link is a song/playback reference. It does not expose raw audio or grant permission to extract it. Analyse user-uploaded or licensed audio only.

## Secrets
Never commit .env files or service-role keys. Use deployment secrets.
