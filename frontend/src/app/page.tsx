"use client";

import { useEffect, useMemo, useState } from "react";
import guitarDb from "../data/guitar-chords.json";
import ukuleleDb from "../data/ukulele-chords.json";

type ChordEvent = { start_seconds: number; end_seconds: number; chord: string; confidence: number; review_status: string };
type AnalysisResult = { duration_seconds: number; key: { name: string; mode: string; confidence: number }; tempo_bpm: number; chord_events: ChordEvent[]; limitations: string[] };

const NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const CHORD_QUALITIES: Record<string,{suffix:string;intervals:number[];guitar:number[];ukulele:number[]}> = {
  "":{suffix:"",intervals:[0,4,7],guitar:[-1,3,2,0,1,0],ukulele:[0,0,0,3]},
  m:{suffix:"m",intervals:[0,3,7],guitar:[-1,3,5,5,4,3],ukulele:[0,3,3,3]},
  "7":{suffix:"7",intervals:[0,4,7,10],guitar:[-1,3,2,3,1,0],ukulele:[0,0,0,1]},
  maj7:{suffix:"maj7",intervals:[0,4,7,11],guitar:[-1,3,2,0,0,0],ukulele:[0,0,0,2]},
  m7:{suffix:"m7",intervals:[0,3,7,10],guitar:[-1,3,5,3,4,3],ukulele:[3,3,3,3]},
  sus2:{suffix:"sus2",intervals:[0,2,7],guitar:[-1,3,0,0,1,0],ukulele:[0,2,3,3]},
  sus4:{suffix:"sus4",intervals:[0,5,7],guitar:[-1,3,3,0,1,1],ukulele:[0,0,1,3]},
  dim:{suffix:"dim",intervals:[0,3,6],guitar:[-1,3,4,5,4,-1],ukulele:[2,3,2,3]},
  aug:{suffix:"aug",intervals:[0,4,8],guitar:[-1,3,2,1,1,0],ukulele:[1,0,0,3]},
  add9:{suffix:"add9",intervals:[0,2,4,7],guitar:[-1,3,2,0,3,0],ukulele:[0,2,0,3]}
};
function parseChord(chord:string) {
  const match=chord.match(/^([A-G](?:#|b)?)(.*)$/);
  if(!match) return null;
  const aliases:Record<string,string>={"min":"m","minor":"m","maj":"maj7","M7":"maj7","min7":"m7","-":"m"};
  const raw=match[2] || "";
  const quality=aliases[raw] ?? raw;
  return {root:match[1],quality:CHORD_QUALITIES[quality] ? quality : ""};
}
type DbPosition = {frets:number[]; fingers:number[]; baseFret:number; barres?:number[]};
type DbEntry = {key:string;suffix:string;positions:DbPosition[]};
type DbFile = {chords:Record<string,DbEntry[]>};
const GUITAR_DATA = guitarDb as DbFile;
const UKULELE_DATA = ukuleleDb as DbFile;
const ENHARMONIC:Record<string,string> = {"C#":"Db","D#":"Eb","F#":"Gb","G#":"Ab","A#":"Bb"};
const QUALITY_SUFFIX:Record<string,string> = {"":"major",m:"minor",min:"minor",minor:"minor",dim:"dim",dim7:"dim7",aug:"aug",sus:"sus",sus2:"sus2",sus4:"sus4","7":"7",maj7:"maj7",m7:"m7",add9:"add9","6":"6","9":"9",m6:"m6",m9:"m9",m7b5:"m7b5", "7sus4":"7sus4"};
function findVoicings(chord:string,instrument:string):DbPosition[] {
  const parsed=parseChord(chord); if(!parsed) return [];
  const data=instrument==="Ukulele"?UKULELE_DATA:GUITAR_DATA;
  const root= data.chords[parsed.root] ? parsed.root : (ENHARMONIC[parsed.root] || parsed.root);
  const suffix=QUALITY_SUFFIX[parsed.quality];
  if(!suffix) return [];
  const entry=(data.chords[root]||[]).find(item=>item.suffix===suffix);
  return entry?.positions || [];
}
function ChordDiagram({ chord, instrument }: { chord: string; instrument: string }) {
  const [choice,setChoice]=useState(0);
  const parsed=parseChord(chord);
  const root=parsed?.root || chord;
  const intervals=parsed?CHORD_QUALITIES[parsed.quality].intervals:[0,4,7];
  if(instrument==="Keyboard"){
    const activeNotes=intervals.map(n=>NOTES[(noteIndex(root)+n)%12]);
    return <div className="keyboard-diagram">{Array.from({length:14},(_,i)=>{const note=["C","D","E","F","G","A","B"][i%7];const active=activeNotes.some(n=>n.startsWith(note));return <span className={active?"key active":"key"} key={i}>{active?note:""}</span>;})}</div>;
  }
  if(instrument==="Bass") return <div className="bass-diagram"><b>{root}</b><span>Chord tones: {intervals.map(n=>NOTES[(noteIndex(root)+n)%12]).join(" · ")}</span></div>;
  const voicings=findVoicings(chord,instrument);
  if(!voicings.length) return <div className="diagram-empty">No verified {instrument.toLowerCase()} voicing in the current library</div>;
  const position=voicings[Math.min(choice,voicings.length-1)];
  const frets=position.frets;
  const strings=frets.length;
  const width=strings===4?88:112;
  const visibleFrets=4;
  return <div className="verified-voicing">
    <svg className="fret-diagram" viewBox={`0 0 ${width} 116`} role="img" aria-label={`${chord} ${instrument} voicing ${choice+1}`}>
      {Array.from({length:strings},(_,i)=><line key={"s"+i} x1={12+i*(width-24)/(strings-1)} y1="18" x2={12+i*(width-24)/(strings-1)} y2="102" stroke="#8390a0" strokeWidth="1.2"/>)}
      {Array.from({length:visibleFrets+1},(_,i)=><line key={"f"+i} x1="12" y1={18+i*21} x2={width-12} y2={18+i*21} stroke="#8390a0" strokeWidth={i===0&&position.baseFret===1?2.5:1}/>)}
      {position.baseFret>1&&<text x="1" y="31" fill="#c5f477" fontSize="8">{position.baseFret}fr</text>}
      {frets.map((f,i)=>{const x=12+i*(width-24)/(strings-1);if(f<0)return <text key={i} x={x} y="11" textAnchor="middle" fill="#f0a0a0" fontSize="10">×</text>;if(f===0)return <text key={i} x={x} y="11" textAnchor="middle" fill="#c5f477" fontSize="10">○</text>;return <g key={i}><circle cx={x} cy={18+(f-.5)*21} r="5.5" fill="#c5f477"/>{position.fingers[i]>0&&<text x={x} y={21+(f-.5)*21} textAnchor="middle" fontSize="6" fill="#14200c">{position.fingers[i]}</text>}</g>;})}
    </svg>
    <div className="voicing-controls"><button type="button" disabled={choice===0} onClick={()=>setChoice(v=>v-1)}>‹</button><span>Shape {choice+1} of {voicings.length}</span><button type="button" disabled={choice===voicings.length-1} onClick={()=>setChoice(v=>v+1)}>›</button></div>
  </div>;
}
const SONGS = [
  { title: "Morning Mercy", artist: "Worship Companion Demo", key: "G" },
  { title: "Build My Life", artist: "Housefires", key: "E" },
  { title: "What A Beautiful Name", artist: "Hillsong Worship", key: "D" }
];
const SHAPES: Record<string, Record<string,string>> = {
  Guitar: { C:"x32010", D:"xx0232", E:"022100", G:"320003", A:"x02220", Am:"x02210", Em:"022000", F:"133211" },
  Ukulele: { C:"0003", D:"2220", E:"1402", G:"0232", A:"2100", Am:"2000", Em:"0432", F:"2010" },
  Bass: { C:"A string · 3rd fret", D:"D string · open", E:"E string · open", G:"E string · 3rd fret", A:"A string · open", Am:"A string · open", Em:"E string · open" },
  Keyboard: { C:"C · E · G", D:"D · F♯ · A", E:"E · G♯ · B", G:"G · B · D", A:"A · C♯ · E", Am:"A · C · E", Em:"E · G · B" }
};
function noteIndex(note: string) {
  const match = note.match(/^([A-G])([#b]?)/);
  if (!match) return -1;
  const spelling = match[1] + match[2];
  if (NOTES.includes(spelling)) return NOTES.indexOf(spelling);
  return match[2] === "b" ? (NOTES.indexOf(match[1]) + 11) % 12 : -1;
}
function transposeChord(chord: string, steps: number) {
  return chord.replace(/(^|\/)([A-G])([#b]?)/g, (whole, prefix, letter, accidental) => {
    const index = noteIndex(letter + accidental);
    return index < 0 ? whole : prefix + NOTES[(index + steps + 120) % 12];
  });
}
function getChords(text: string) {
  return Array.from(new Set(Array.from(text.matchAll(/\[([A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?\d*(?:\/[A-G](?:#|b)?)?)\]/g), x => x[1].trim())));
}
export default function Home() {
  const [tab, setTab] = useState("shared");
  const [learningMode, setLearningMode] = useState("beginner");
  const [chordDisplay, setChordDisplay] = useState("names");
  const [saved, setSaved] = useState(false);
  const [title, setTitle] = useState("My worship song");
  const [artist, setArtist] = useState("");
  const [key, setKey] = useState("G");
  const [shift, setShift] = useState(0);
  const [instrument, setInstrument] = useState("Guitar");
  const [url, setUrl] = useState("");
  const [audioName, setAudioName] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [message, setMessage] = useState("Workspace ready. Add a song link, upload authorised audio, or edit a chart.");
  const [lyrics, setLyrics] = useState("[Verse 1]\n[G]Your love is here in the [D]morning light\n[Em]You guide my steps and [C]make them right\n\n[Chorus]\n[G]I will sing with all my [D]heart\n[Em]You have been with me from the [C]start");
  const chords = useMemo(() => getChords(lyrics), [lyrics]);
  const currentKey = NOTES[(noteIndex(key) + shift + 120) % 12];
  const transposedLyrics = lyrics.replace(/\[([^\]]+)\]/g, (_, chord) => "[" + transposeChord(chord.trim(), shift) + "]");
  const transposedChords = chords.map(chord => transposeChord(chord, shift));
  const shapes = SHAPES[instrument];
  useEffect(() => { try { const draft = localStorage.getItem("worship-companion-draft"); if (draft) { const d = JSON.parse(draft); setTitle(d.title || "My worship song"); setArtist(d.artist || ""); setKey(d.key || "G"); setLyrics(d.lyrics || ""); setLearningMode(d.learningMode || "beginner"); setChordDisplay(d.chordDisplay || "names"); setSaved(true); } } catch {} }, []);
  function saveDraft() { try { localStorage.setItem("worship-companion-draft", JSON.stringify({title,artist,key,lyrics,learningMode,chordDisplay})); setSaved(true); setMessage("Saved on this device. Your song sheet will be here when you return using this browser."); } catch { setMessage("Could not save in this browser. Check your browser storage settings."); } }
  function displayChord(chord: string) { if (chordDisplay === "names") return chord; const root = parseChord(chord)?.root || chord.match(/^[A-G](?:#|b)?/)?.[0] || chord; const interval = (noteIndex(root) - noteIndex(currentKey) + 12) % 12; const degrees: Record<number,string> = {0:"1",2:"2",4:"3",5:"4",7:"5",9:"6",11:"7"}; const degree = degrees[interval]; if (!degree) return chord; const quality = /dim/.test(chord) ? "dim" : /m(?!aj)/.test(chord) ? "m" : ""; return degree + quality; }

  function addLink() {
    if (!url.trim()) { setMessage("Paste a YouTube or Spotify URL first."); return; }
    try {
      const host = new URL(url).hostname;
      setMessage(["youtube.com","www.youtube.com","youtu.be","open.spotify.com"].includes(host)
        ? "Link saved as a song reference. Streaming links do not provide raw audio for chord analysis."
        : "Reference saved. YouTube and Spotify are the recognised providers.");
    } catch { setMessage("Please enter a valid URL."); }
  }
  function addAudio(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("audio/")) { setMessage("Please select an audio file."); return; }
    setAudioFile(file);
    setAudioName(file.name);
    setAnalysis(null);
    setMessage("Audio selected. Press Analyse audio to send it to your configured API.");
  }

  async function analyseAudio() {
    if (!audioFile) { setMessage("Choose an audio file first."); return; }
    setAnalysing(true);
    setMessage("Uploading audio and analysing…");
    try {
      const body = new FormData();
      body.append("file", audioFile);
      const apiBaseRaw = process.env.NEXT_PUBLIC_ANALYSIS_API_URL || "http://localhost:8000";
      const apiBase = apiBaseRaw.endsWith("/") ? apiBaseRaw.slice(0, -1) : apiBaseRaw;
      const response = await fetch(apiBase + "/v1/audio/analyse", { method: "POST", body });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || "Analysis request failed.");
      setAnalysis(payload as AnalysisResult);
      if (payload.key?.name) setKey(payload.key.name);
      setShift(0);
      setMessage("Audio analysis complete. Review every suggested chord before using it in a church arrangement.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not reach the audio analysis server. Check its URL and status.");
    } finally {
      setAnalysing(false);
    }
  }
  function updateLyrics(value: string) {
    setLyrics(value.replace(/\[([^\]]+)\]/g, (_, chord) => "[" + transposeChord(chord.trim(), -shift) + "]"));
  }
  function openSong(song: typeof SONGS[number]) {
    setTitle(song.title); setArtist(song.artist); setKey(song.key); setShift(0);
    setMessage("Sample arrangement opened. Replace it with a song chart you are authorised to use.");
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">♫</span><span><b>WORSHIP</b><small>COMPANION · BETA</small></span></div>
      <p className="side-label">WORKSPACE</p>
      <button className={tab === "shared" ? "side-link active" : "side-link"} onClick={() => setTab("shared")}>▦ <span>Church songbook</span><b>03</b></button>
      <button className={tab === "mine" ? "side-link active" : "side-link"} onClick={() => setTab("mine")}>♡ <span>My songbook</span></button>
      <p className="side-label space-top">LEARN</p>
      <button className="side-link" onClick={() => setMessage("Instrument Academy is planned for a future milestone.")}>♬ <span>Instrument academy</span></button>
      <button className="side-link" onClick={() => setMessage("Practice Room is planned for a future milestone.")}>◷ <span>Practice room</span></button>
      <div className="sidebar-bottom"><span className="avatar">M</span><span><b>Music team</b><small>Church workspace · preview</small></span><i /></div>
    </aside>
    <section className="main-area">
      <header className="topbar"><div><span className="crumb">MUSIC WORKSPACE</span><span className="crumb-sep">/</span><strong>{tab === "shared" ? "Church songbook" : "My songbook"}</strong></div><span className="private-chip">● CHURCH EDITION · PREVIEW</span></header>
      <div className="content">
        <section className="welcome-row"><div><p className="eyebrow">THE MUSIC TEAM&apos;S DIGITAL SONGBOOK</p><h1>Make music together.</h1><p className="subhead">Learn the song. Understand the chords. Play with confidence.</p></div><div className="welcome-note"><span>♫</span><small>LEARN · PRACTISE · SERVE</small></div></section>
        <section className="import-card">
          <div className="import-heading"><div><span className="step">01</span><div><h2>Bring a song into the lab</h2><p>Paste a link for reference, or select audio you have permission to use.</p></div></div><span className="soft-tag">SONG IMPORT</span></div>
          <div className="import-grid">
            <div><label className="field-label" htmlFor="song-url">YOUTUBE / SPOTIFY LINK</label><div className="input-action"><input id="song-url" value={url} onChange={e => setUrl(e.target.value)} placeholder="Paste a song URL..." /><button onClick={addLink}>Add link ↗</button></div></div>
            <div><label className="field-label" htmlFor="audio-file">AUTHORISED AUDIO UPLOAD</label><div className="filebox"><input id="audio-file" type="file" accept="audio/*" onChange={e => addAudio(e.target.files?.[0])} /><span>{audioName || "Choose audio · MP3, WAV, M4A"}</span></div>{audioFile && <button className="analyse-button" onClick={analyseAudio} disabled={analysing}>{analysing ? "Analysing…" : "Analyse audio ↗"}</button>}</div>
          </div>
          <p className="status">{message}</p>
        </section>
        <div className="workspace-grid">
          <section className="library-card"><div className="card-heading"><div><span className="eyebrow">YOUR LIBRARY</span><h2>{tab === "shared" ? "Church songs" : "My practice songs"}</h2></div><span className="soft-tag">03</span></div>
            {SONGS.map((song, i) => <button className={title === song.title ? "song-row selected" : "song-row"} key={song.title} onClick={() => openSong(song)}><span className="song-index">0{i+1}</span><span className="song-details"><b>{song.title}</b><small>{song.artist}</small></span><span className="song-key">{song.key}</span></button>)}
            <button className="add-song" onClick={() => {setTitle("New song");setArtist("");setLyrics("");setMessage("New song sheet started in this preview. Add chord-tagged lyrics.");}}>＋ Add a song sheet</button>
            <p className="library-note">Sample entries only. Live private and shared songbooks will be connected to the church database.</p>
          </section>
          <section className="song-card">
            <div className="song-heading"><div><span className="eyebrow">02 / SONG WORKSPACE</span><input className="song-title-input" aria-label="Song title" value={title} onChange={e=>{setTitle(e.target.value);setSaved(false);}}/><input className="song-artist-input" aria-label="Artist" placeholder="Add artist" value={artist} onChange={e=>{setArtist(e.target.value);setSaved(false);}}/><p><span className="green">●</span> Editable arrangement</p></div><span className="soft-tag">{saved ? "SAVED ON THIS DEVICE" : "DRAFT"}</span></div>
            <div className="song-stats"><div><small>DETECTED KEY</small><b>{analysis ? analysis.key.name : key} <i>{analysis ? analysis.key.mode + " / estimate" : "Not analysed"}</i></b></div><div><small>YOUR PLAYING KEY</small><b className="green">{currentKey}</b></div><div><small>TEMPO</small><b>{analysis ? Math.round(analysis.tempo_bpm) + " BPM" : "—"} <i>{analysis ? "estimate" : "Not analysed"}</i></b></div></div>
            <div className="transpose"><div><span className="eyebrow">TRANSPOSITION</span><b>Make it comfortable to play</b></div><div className="transpose-tools"><button onClick={() => setShift(v => v - 1)}>−</button><span>{shift > 0 ? "+" : ""}{shift}<small>SEMITONES</small></span><button onClick={() => setShift(v => v + 1)}>＋</button><button className="reset" onClick={() => setShift(0)}>Reset</button></div></div>
            {analysis && <section className="analysis-results"><div className="section-heading"><div><span className="eyebrow">AUDIO ANALYSIS · EXPERIMENTAL</span><h3>Estimated chord timeline</h3></div><span className="soft-tag">{analysis.chord_events.length} EVENTS</span></div><p className="muted">Key confidence: {Math.round(analysis.key.confidence * 100)}% · Audio duration: {Math.round(analysis.duration_seconds)} seconds. Confidence is a heuristic, not a guaranteed accuracy score.</p><div className="timeline">{analysis.chord_events.map((event, index) => <div className="timeline-event" key={index}><span>{Math.floor(event.start_seconds / 60)}:{String(Math.floor(event.start_seconds % 60)).padStart(2, "0")}</span><b>{transposeChord(event.chord, shift)}</b><div className="confidence-track"><i style={{width: Math.round(event.confidence * 100) + "%"}} /></div><small>{Math.round(event.confidence * 100)}%</small></div>)}</div><ul className="limitations">{analysis.limitations.map(item => <li key={item}>{item}</li>)}</ul></section>}
            <div className="instrument-area"><div className="section-heading"><div><span className="eyebrow">03 / INSTRUMENT VIEW</span><h3>How do you play?</h3></div><span className="soft-tag">CHORD REFERENCE</span></div>
              <div className="mode-switch"><span className="eyebrow">LEARNING MODE</span><div><button className={learningMode==="beginner"?"mode-option active":"mode-option"} onClick={()=>setLearningMode("beginner")}>Beginner</button><button className={learningMode==="musician"?"mode-option active":"mode-option"} onClick={()=>setLearningMode("musician")}>Musician</button></div></div>
              <div className="display-switch"><span className="eyebrow">CHORD DISPLAY</span><div><button className={chordDisplay==="names"?"mode-option active":"mode-option"} onClick={()=>setChordDisplay("names")}>Chord names</button><button className={chordDisplay==="numbers"?"mode-option active":"mode-option"} onClick={()=>setChordDisplay("numbers")}>Nashville numbers</button></div></div>
              <div className="instrument-tabs">{["Guitar","Ukulele","Bass","Keyboard"].map(name => <button key={name} className={instrument === name ? "instrument-tab active" : "instrument-tab"} onClick={() => setInstrument(name)}>{name === "Guitar" ? "🎸" : name === "Ukulele" ? "🪕" : name === "Bass" ? "𝄢" : "🎹"} {name}</button>)}</div>
              <div className="chord-grid">{transposedChords.length ? transposedChords.map((chord, i) => <div className="chord-box" key={chord+i}><b>{displayChord(chord)}</b>{learningMode==="beginner" && <ChordDiagram chord={chord} instrument={instrument}/>}<small>{instrument==="Guitar" || instrument==="Ukulele" ? "Verified chord diagrams coming next" : instrument==="Keyboard" ? "Highlighted chord notes" : "Chord tones"}</small></div>) : <p className="muted">Add chord tags such as [G], [D], [Em] in the lyrics editor.</p>}</div>
            </div>
            <div className="lyrics-area"><div className="section-heading"><div><span className="eyebrow">04 / SONG SHEET</span><h3>Lyrics & chords</h3></div><span className="soft-tag">EDITABLE</span></div><p className="muted">Place chord names in square brackets immediately before a lyric phrase.</p><textarea value={transposedLyrics} onChange={e => updateLyrics(e.target.value)} spellCheck={false} aria-label="Lyrics and chord editor" /><div className="sheet-foot"><span>{chords.length} chord labels · local preview only</span><button onClick={saveDraft}>Save on this device ↗</button></div></div>
          </section>
        </div>
        <footer>WORSHIP COMPANION BETA <span>·</span> Built for musicians learning together.</footer>
      </div>
    </section>
  </main>;
}
