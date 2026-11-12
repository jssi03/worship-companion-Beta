from __future__ import annotations
import os, tempfile
from pathlib import Path
from typing import Any
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Worship Companion Analysis API", version="0.1.0")
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(CORSMiddleware, allow_origins=[x.strip() for x in origins if x.strip()], allow_credentials=True, allow_methods=["GET","POST"], allow_headers=["*"])
MAX_BYTES = 50 * 1024 * 1024
ALLOWED = {".wav",".mp3",".m4a",".ogg",".flac",".aiff"}

@app.get("/health")
async def health() -> dict[str,str]:
    return {"status":"ok","service":"worship-companion-analysis","analysis":"experimental"}

@app.post("/v1/audio/analyse")
async def analyse_audio(file: UploadFile = File(...)) -> dict[str,Any]:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED:
        raise HTTPException(status_code=415, detail="Unsupported audio extension.")
    if file.content_type and not file.content_type.startswith("audio/") and file.content_type != "application/octet-stream":
        raise HTTPException(status_code=415, detail="Expected audio upload.")
    data = await file.read(MAX_BYTES + 1)
    if not data: raise HTTPException(status_code=400, detail="Empty audio upload.")
    if len(data) > MAX_BYTES: raise HTTPException(status_code=413, detail="File exceeds 50 MB prototype limit.")
    path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(data); path = tmp.name
        import librosa, numpy as np
        y, sr = librosa.load(path, sr=22050, mono=True)
        if len(y) < sr * 3: raise HTTPException(status_code=400, detail="Audio must be at least three seconds.")
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=1024)
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr, hop_length=512)
        name, mode, confidence = estimate_key(chroma)
        events = estimate_chords(chroma, sr, 1024)
        return {"status":"estimated","duration_seconds":round(float(librosa.get_duration(y=y,sr=sr)),2),
                "key":{"name":name,"mode":mode,"confidence":confidence},
                "tempo_bpm":round(float(np.asarray(tempo).reshape(-1)[0]),1),
                "chord_events":events,
                "limitations":["Baseline chroma/template estimator, not a trained polyphonic model.",
                               "Only major/minor triads are estimated; inversions and extended chords may be wrong.",
                               "Musician review is required before an arrangement can be marked verified."]}
    except HTTPException: raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Audio analysis failed: {type(exc).__name__}") from exc
    finally:
        if path and os.path.exists(path): os.remove(path)

def estimate_key(chroma: Any) -> tuple[str,str,float]:
    import numpy as np
    major=np.array([6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88])
    minor=np.array([6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17])
    notes=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]; mean=np.asarray(chroma).mean(axis=1)
    ranked=[]
    for root in range(12):
        for mode,profile in (("major",major),("minor",minor)):
            score=float(np.corrcoef(mean,np.roll(profile,root))[0,1])
            if np.isfinite(score): ranked.append((score,notes[root],mode))
    ranked.sort(reverse=True); best=ranked[0]
    return best[1],best[2],round(max(0,min(1,(best[0]+1)/2)),3)

def estimate_chords(chroma: Any, sr: int, hop: int) -> list[dict[str,Any]]:
    import numpy as np
    notes=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]
    count=max(1,round(2/(hop/sr))); templates=[]
    for root in range(12):
        for quality,third in (("",4),("m",3)):
            tones={root,(root+third)%12,(root+7)%12}; templates.append((notes[root]+quality,tones))
    output=[]
    for start in range(0,chroma.shape[1],count):
        end=min(chroma.shape[1],start+count); segment=np.asarray(chroma[:,start:end]).mean(axis=1); ranked=[]
        for label,tones in templates:
            inside=float(segment[list(tones)].mean()); outside=float(np.delete(segment,list(tones)).mean())
            ranked.append((inside-.45*outside,label))
        ranked.sort(reverse=True)
        if not ranked: continue
        top,label=ranked[0]; second=ranked[1][0] if len(ranked)>1 else top
        start_s=round(start*hop/sr,2); end_s=round(end*hop/sr,2); confidence=round(max(0,min(1,.5+(top-second)*2.5)),3)
        if output and output[-1]["chord"]==label and output[-1]["end_seconds"]==start_s:
            output[-1]["end_seconds"]=end_s; output[-1]["confidence"]=round((output[-1]["confidence"]+confidence)/2,3)
        else: output.append({"start_seconds":start_s,"end_seconds":end_s,"chord":label,"confidence":confidence,"review_status":"unreviewed"})
    return output


# YouTube source inspection is metadata-only. The official oEmbed endpoint does
# not expose captions or raw audio; those require separate permissions/sources.
from urllib.parse import urlparse, parse_qs
from urllib.request import Request, urlopen
import json
import re
from fastapi import Query

def parse_youtube_id(value: str) -> str | None:
    parsed = urlparse(value)
    host = (parsed.hostname or "").lower().removeprefix("www.")
    if host in {"youtu.be"}:
        candidate = parsed.path.strip("/").split("/")[0]
    elif host in {"youtube.com", "m.youtube.com", "music.youtube.com"}:
        candidate = parse_qs(parsed.query).get("v", [None])[0]
        if not candidate:
            match = re.match(r"^/(?:shorts|embed|live)/([^/?]+)", parsed.path)
            candidate = match.group(1) if match else None
    else:
        return None
    return candidate if candidate and re.fullmatch(r"[A-Za-z0-9_-]{11}", candidate) else None

@app.get("/v1/sources/youtube/inspect")
async def inspect_youtube(url: str = Query(..., min_length=8, max_length=2048)) -> dict[str, Any]:
    video_id = parse_youtube_id(url)
    if not video_id:
        raise HTTPException(status_code=400, detail="Enter a valid YouTube video URL.")
    endpoint = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
    try:
        request = Request(endpoint, headers={"User-Agent": "WorshipCompanion/1.0"})
        def fetch_metadata() -> dict[str, Any]:
            with urlopen(request, timeout=8) as response:
                return json.loads(response.read(1024 * 256).decode("utf-8"))
        metadata = await __import__("asyncio").to_thread(fetch_metadata)
        return {
            "video_id": video_id,
            "title": metadata.get("title"),
            "author_name": metadata.get("author_name"),
            "thumbnail_url": metadata.get("thumbnail_url"),
            "embed_url": f"https://www.youtube-nocookie.com/embed/{video_id}",
            "source_type": "youtube",
            "caption_status": "owner_oauth_required",
            "caption_message": "YouTube metadata is available. Caption retrieval requires an authenticated channel owner/editor account with permission to access that video's caption track.",
            "audio_status": "authorised_audio_required",
            "audio_message": "A YouTube URL does not provide raw audio for analysis. Upload an audio file you are authorised to process."
        }
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Could not retrieve public YouTube metadata. The video may be private, unavailable, or block embedding.") from exc

@app.post("/v1/audio/transcribe")
async def transcribe_audio(file: UploadFile = File(...)) -> dict[str, Any]:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED:
        raise HTTPException(status_code=415, detail="Unsupported audio extension.")
    data = await file.read(MAX_BYTES + 1)
    if not data:
        raise HTTPException(status_code=400, detail="Empty audio upload.")
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 50 MB prototype limit.")
    path = None
    try:
        try:
            from faster_whisper import WhisperModel
        except ImportError as exc:
            raise HTTPException(status_code=503, detail="Lyrics transcription is not configured on this server yet. Install backend/requirements-transcription.txt and deploy the backend again.") from exc
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(data)
            path = tmp.name
        model_name = os.getenv("WHISPER_MODEL", "small")
        model = WhisperModel(model_name, device=os.getenv("WHISPER_DEVICE", "cpu"), compute_type=os.getenv("WHISPER_COMPUTE_TYPE", "int8"))
        segments, info = model.transcribe(path, vad_filter=True, word_timestamps=False)
        output = [{"start_seconds": round(s.start, 2), "end_seconds": round(s.end, 2), "text": s.text.strip()} for s in segments]
        return {"status": "transcribed", "language": info.language, "language_probability": round(float(info.language_probability), 3), "segments": output, "transcript": "\\n".join(s["text"] for s in output), "limitations": ["Speech recognition may mishear sung lyrics, especially melisma, backing vocals, Tamil-English mixing, and repeated phrases.", "Review and correct the transcript before publishing."]}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Transcription failed: {type(exc).__name__}") from exc
    finally:
        if path and os.path.exists(path):
            os.remove(path)
