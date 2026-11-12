"use client";

import { useEffect, useMemo, useState } from "react";

type ChordEvent = { start_seconds: number; end_seconds: number; chord: string; confidence: number; review_status: string };
type AnalysisResult = { duration_seconds: number; key: { name: string; mode: string; confidence: number }; tempo_bpm: number; chord_events: ChordEvent[]; limitations: string[] };

const NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const GUITAR_FINGERINGS: Record<string,number[]> = {
  C:[-1,3,2,0,1,0],Cm:[-1,3,5,5,4,3],C#:[-1,4,6,6,6,4],C#m:[-1,4,6,6,5,4],
  D:[-1,-1,0,2,3,2],Dm:[-1,-1,0,2,3,1],D#:[-1,6,8,8,8,6],D#m:[-1,6,8,8,7,6],
  E:[0,2,2,1,0,0],Em:[0,2,2,0,0,0],F:[1,3,3,2,1,1],Fm:[1,3,3,1,1,1],
  F#:[2,4,4,3,2,2],F#m:[2,4,4,2,2,2],G:[3,2,0,0,0,3],Gm:[3,5,5,3,3,3],
  G#:[4,6,6,5,4,4],G#m:[4,6,6,4,4,4],A:[-1,0,2,2,2,0],Am:[-1,0,2,2,1,0],
  A#:[-1,1,3,3,3,1],A#m:[-1,1,3,3,2,1],B:[-1,2,4,4,4,2],Bm:[-1,2,4,4,3,2]
};
const UKULELE_FINGERINGS: Record<string,number[]> = {
  C:[0,0,0,3],Cm:[0,3,3,3],C#:[1,1,1,4],C#m:[1,1,0,4],D:[2,2,2,0],Dm:[2,2,1,0],
  D#:[3,3,3,1],D#m:[3,3,2,1],E:[4,4,4,2],Em:[0,4,3,2],F:[2,0,1,0],Fm:[1,0,1,3],
  F#:[3,1,2,1],F#m:[2,1,2,0],G:[0,2,3,2],Gm:[0,2,3,1],G#:[1,3,4,3],G#m:[1,3,4,2],
  A:[2,1,0,0],Am:[2,0,0,0],A#:[3,2,1,1],A#m:[3,1,1,1],B:[4,3,2,2],Bm:[4,2,2,2]
};
function ChordDiagram({ chord, instrument }: { chord: string; instrument: string }) {
  const root = chord.match(/^[A-G](?:#|b)?/)?.[0] || chord;
  const fingeringMap = instrument === "Ukulele" ? UKULELE_FINGERINGS : GUITAR_FINGERINGS;
  const fingers = fingeringMap[chord] || fingeringMap[root];
  if (instrument === "Keyboard") {
    const notes: Record<string,string[]> = {C:["C","E","G"],D:["D","F#","A"],E:["E","G#","B"],G:["G","B","D"],A:["A","C#","E"],Am:["A","C","E"],Em:["E","G","B"],F:["F","A","C"]};
    return <div className="keyboard-diagram">{Array.from({length:14},(_,i)=>{const note=["C","D","E","F","G","A","B"][i%7]; const active=(notes[root]||[]).includes(note); return <span className={active?"key active":"key"} key={i}>{active?note:""}</span>;})}</div>;
  }
  if (instrument === "Bass") return <div className="bass-diagram"><b>{root}</b><span>Root note · {root} scale position</span></div>;
  if (!fingers) return <div className="diagram-empty">Diagram coming soon</div>;
  const strings = fingers.length, frets = 4, width = strings === 4 ? 88 : 112;
  const positiveFrets = fingers.filter(f => f > 0);
  const firstFret = positiveFrets.length && Math.min(...positiveFrets) > 1 ? Math.min(...positiveFrets) : 1;
  return <svg className="fret-diagram" viewBox={`0 0 ${width} 112`} role="img" aria-label={`${chord} ${instrument} chord diagram`}>
    {Array.from({length:strings},(_,i)=><line key={"s"+i} x1={12+i*(width-24)/(strings-1)} y1="16" x2={12+i*(width-24)/(strings-1)} y2="100" stroke="#8390a0" strokeWidth="1.2"/>)}
    {Array.from({length:frets+1},(_,i)=><line key={"f"+i} x1="12" y1={16+i*21} x2={width-12} y2={16+i*21} stroke="#8390a0" strokeWidth={i===0 && firstFret===1?2.5:1}/>)}
    {firstFret>1 && <text x="2" y="29" fill="#c5f477" fontSize="8">{firstFret}fr</text>}
    {fingers.map((f,i)=>f<0?<text key={i} x={12+i*(width-24)/(strings-1)} y="10" textAnchor="middle" fill="#f0a0a0" fontSize="10">×</text>:f===0?<text key={i} x={12+i*(width-24)/(strings-1)} y="10" textAnchor="middle" fill="#c5f477" fontSize="10">○</text>:<circle key={i} cx={12+i*(width-24)/(strings-1)} cy={16+(f-firstFret+.5)*21} r="5.5" fill="#c5f477"/>)}
  </svg>;
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
  function displayChord(chord: string) { if (chordDisplay === "names") return chord; const root = chord.match(/^[A-G](?:#|b)?/)?.[0] || chord; const interval = (noteIndex(root) - noteIndex(currentKey) + 12) % 12; const degrees: Record<number,string> = {0:"1",2:"2",4:"3",5:"4",7:"5",9:"6",11:"7"}; const degree = degrees[interval]; if (!degree) return chord; const quality = /dim/.test(chord) ? "dim" : /m(?!aj)/.test(chord) ? "m" : ""; return degree + quality; }

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
              <div className="chord-grid">{transposedChords.length ? transposedChords.map((chord, i) => <div className="chord-box" key={chord+i}><b>{displayChord(chord)}</b>{learningMode==="beginner" && <ChordDiagram chord={chord} instrument={instrument}/>}<small>{learningMode==="beginner" ? "Finger placement" : (shapes[chord] || shapes[chord.match(/^[A-G](?:#|b)?/)?.[0] || chord] || "Voicing reference to be added")}</small></div>) : <p className="muted">Add chord tags such as [G], [D], [Em] in the lyrics editor.</p>}</div>
            </div>
            <div className="lyrics-area"><div className="section-heading"><div><span className="eyebrow">04 / SONG SHEET</span><h3>Lyrics & chords</h3></div><span className="soft-tag">EDITABLE</span></div><p className="muted">Place chord names in square brackets immediately before a lyric phrase.</p><textarea value={transposedLyrics} onChange={e => updateLyrics(e.target.value)} spellCheck={false} aria-label="Lyrics and chord editor" /><div className="sheet-foot"><span>{chords.length} chord labels · local preview only</span><button onClick={saveDraft}>Save on this device ↗</button></div></div>
          </section>
        </div>
        <footer>WORSHIP COMPANION BETA <span>·</span> Built for musicians learning together.</footer>
      </div>
    </section>
  </main>;
}
