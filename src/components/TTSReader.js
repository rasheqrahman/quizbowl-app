import React, { useState } from "react";
import { ChevronDown, ChevronUp, Play, Pause, StopCircle, Volume2 } from "lucide-react";
import useGoogleCloudTTS from "../hooks/useGoogleCloudTTS";

export default function TTSReader() {
  const [text, setText] = useState("");
  const [showVoices, setShowVoices] = useState(false);
  const {
    voices,
    selectedVoice,
    setSelectedVoice,
    loadingVoices,
    errorVoices,
    speak,
    loadingSpeak,
    errorSpeak,
    speaking,
    paused,
    pause,
    resume,
    stop,
    audioRef,
  } = useGoogleCloudTTS();

  return (
    <div className="bg-gray-900 rounded-xl p-6 shadow-lg max-w-xl mx-auto mt-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold mb-2">
        <Volume2 className="w-5 h-5" /> Text-to-Speech Reader
      </h2>
      <textarea
        className="w-full h-24 rounded-md bg-gray-800 text-gray-100 p-2 mb-2 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Enter text to speak..."
        value={text}
        onChange={e => setText(e.target.value)}
        disabled={loadingSpeak}
      />
      <div className="flex items-center gap-2 mb-2">
        <button
          className="rounded bg-blue-600 hover:bg-blue-700 px-3 py-1 font-semibold text-sm flex items-center gap-1 disabled:opacity-50"
          onClick={() => speak(text)}
          disabled={!text.trim() || loadingSpeak}
        >
          {speaking && !paused ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {speaking && !paused ? "Pause" : "Speak"}
        </button>
        {speaking && (
          <>
            {paused ? (
              <button
                className="rounded bg-blue-600 hover:bg-blue-700 px-3 py-1 font-semibold text-sm flex items-center gap-1"
                onClick={resume}
              >
                <Play className="w-4 h-4" /> Resume
              </button>
            ) : (
              <button
                className="rounded bg-blue-600 hover:bg-blue-700 px-3 py-1 font-semibold text-sm flex items-center gap-1"
                onClick={pause}
              >
                <Pause className="w-4 h-4" /> Pause
              </button>
            )}
            <button
              className="rounded bg-red-600 hover:bg-red-700 px-3 py-1 font-semibold text-sm flex items-center gap-1"
              onClick={stop}
            >
              <StopCircle className="w-4 h-4" /> Stop
            </button>
          </>
        )}
        <button
          className="ml-auto rounded bg-gray-700 hover:bg-gray-600 px-2 py-1 flex items-center gap-1 text-xs"
          onClick={() => setShowVoices(v => !v)}
        >
          Voice {showVoices ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>
      {showVoices && (
        <div className="mb-2">
          {loadingVoices ? (
            <div className="text-blue-400 text-sm">Loading voices...</div>
          ) : errorVoices ? (
            <div className="text-red-400 text-sm">{errorVoices}</div>
          ) : (
            <select
              className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-gray-100"
              value={selectedVoice?.name || ''}
              onChange={e => {
                const v = voices.find(v => v.name === e.target.value);
                setSelectedVoice(v);
              }}
            >
              {voices.map(v => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.languageCodes[0]}, {v.ssmlGender})
                </option>
              ))}
            </select>
          )}
        </div>
      )}
      {loadingSpeak && <div className="text-blue-400 text-sm">Synthesizing speech...</div>}
      {errorSpeak && <div className="text-red-400 text-sm">{errorSpeak}</div>}
      <audio ref={audioRef} hidden />
    </div>
  );
}
