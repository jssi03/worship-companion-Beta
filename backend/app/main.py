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
