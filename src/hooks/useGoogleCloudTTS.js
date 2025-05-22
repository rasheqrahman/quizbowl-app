import { useEffect, useRef, useState, useCallback } from "react";

const API_KEY = process.env.REACT_APP_GCLOUD_TTS_API_KEY;
const VOICES_ENDPOINT = `https://texttospeech.googleapis.com/v1/voices?key=${API_KEY}`;
const SYNTH_ENDPOINT = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`;

export default function useGoogleCloudTTS() {
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [errorVoices, setErrorVoices] = useState(null);
  const [loadingSpeak, setLoadingSpeak] = useState(false);
  const [errorSpeak, setErrorSpeak] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const audioRef = useRef(null);

  // Fetch English voices
  useEffect(() => {
    setLoadingVoices(true);
    fetch(VOICES_ENDPOINT)
      .then(res => res.json())
      .then(data => {
        let englishVoices = (data.voices || []).filter(v => v.languageCodes.some(code => code.startsWith('en-')));
        englishVoices.sort((a, b) => (a.name > b.name ? 1 : -1));
        setVoices(englishVoices);
        // Default: en-US Wavenet, else en-US, else first
        let def = englishVoices.find(v => v.name.includes('en-US') && v.name.includes('Wavenet')) ||
                  englishVoices.find(v => v.name.includes('en-US')) ||
                  englishVoices[0];
        setSelectedVoice(def || null);
        setErrorVoices(null);
      })
      .catch(e => setErrorVoices(e.message || 'Failed to fetch voices'))
      .finally(() => setLoadingVoices(false));
  }, []);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleEnded = () => { setSpeaking(false); setPaused(false); };
    const handlePause = () => { setPaused(true); };
    const handlePlay = () => { setSpeaking(true); setPaused(false); };
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);
    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
    };
  }, []);

  // Synthesize speech
  const speak = useCallback(async (text, voiceOverride) => {
    if (!API_KEY) {
      setErrorSpeak('Missing Google Cloud API key');
      return;
    }
    setLoadingSpeak(true);
    setErrorSpeak(null);
    setPaused(false);
    setSpeaking(false);
    try {
      const body = {
        input: { text },
        voice: {
          languageCode: (voiceOverride || selectedVoice)?.languageCodes[0] || 'en-US',
          name: (voiceOverride || selectedVoice)?.name || 'en-US-Wavenet-D',
        },
        audioConfig: {
          audioEncoding: 'MP3',
        },
      };
      const res = await fetch(SYNTH_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to synthesize speech');
      const data = await res.json();
      if (!data.audioContent) throw new Error('No audio content returned');
      const audio = audioRef.current;
      audio.src = `data:audio/mp3;base64,${data.audioContent}`;
      audio.play();
      setSpeaking(true);
      setPaused(false);
    } catch (e) {
      setErrorSpeak(e.message || 'Speech synthesis failed');
    } finally {
      setLoadingSpeak(false);
    }
  }, [selectedVoice]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (audio && !audio.paused) audio.pause();
  }, []);

  const resume = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.paused) audio.play();
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setSpeaking(false);
      setPaused(false);
    }
  }, []);

  return {
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
  };
}
