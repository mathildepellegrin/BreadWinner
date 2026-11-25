import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, Phone, Brain, Volume2, VolumeX, Send, Loader2 } from 'lucide-react';

interface InterviewRoomProps {
  sessionId: number;
  onFinish: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const GREETING_TEXT =
  "Hello! I'm your HireSync AI interviewer. Let's begin. Please introduce yourself and tell me a bit about your background.";

export default function InterviewRoom({ sessionId, onFinish }: InterviewRoomProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [transcript, setTranscript] = useState<{ role: 'ai' | 'user'; text: string }[]>([]);

  const userVideoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null);
  const userStreamRef = useRef<MediaStream | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const isMutedRef = useRef(false);
  const lastAITextRef = useRef<string>(GREETING_TEXT);

  useEffect(() => {
    isMutedRef.current = isMuted;
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    isMountedRef.current = true;
    initUserCamera();
    handleAIResponse(GREETING_TEXT);

    return () => {
      isMountedRef.current = false;
      cleanupMedia();
    };
  }, []);

  useEffect(() => {
    if (transcriptRef.current) {
      setTimeout(() => {
        if (transcriptRef.current) {
          transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
        }
      }, 0);
    }
  }, [transcript, isThinking]);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors if already stopped
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const cleanupMedia = () => {
    stopAudio();
    stopListening();
    if (userStreamRef.current) {
      userStreamRef.current.getTracks().forEach((track) => track.stop());
      userStreamRef.current = null;
    }
  };

  const initUserCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (!isMountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      userStreamRef.current = stream;
      if (userVideoRef.current) {
        userVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access denied:', err);
      setIsCameraOn(false);
    }
  };

  const toggleCamera = () => {
    if (!userStreamRef.current) return;
    const videoTracks = userStreamRef.current.getVideoTracks();
    const nextState = !isCameraOn;
    videoTracks.forEach((track) => {
      track.enabled = nextState;
    });
    setIsCameraOn(nextState);
  };

  const speakWithBrowserFallback = (text: string) => {
    if (!('speechSynthesis' in window)) {
      setIsSpeaking(false);
      startListening();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.onstart = () => {
        if (isMountedRef.current) setIsSpeaking(true);
      };
      utterance.onend = () => {
        if (isMountedRef.current) {
          setIsSpeaking(false);
          startListening();
        }
      };
      utterance.onerror = () => {
        if (isMountedRef.current) setIsSpeaking(false);
      };
      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
    }
  };

  const playElevenLabsSpeech = async (text: string) => {
    stopAudio();
    stopListening();
    setAudioBlocked(false);

    if (isMutedRef.current) {
      startListening();
      return;
    }

    try {
      setIsSpeaking(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/interviews/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        throw new Error(`TTS failed with status ${res.status}`);
      }

      const audioBlob = await res.blob();
      if (!isMountedRef.current) return;

      const url = URL.createObjectURL(audioBlob);
      audioUrlRef.current = url;
      const audio = new Audio(url);
      audio.muted = isMutedRef.current;
      audioRef.current = audio;

      audio.onended = () => {
        if (!isMountedRef.current) return;
        setIsSpeaking(false);
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
        startListening();
      };

      audio.onerror = () => {
        if (!isMountedRef.current) return;
        setIsSpeaking(false);
      };

      try {
        await audio.play();
      } catch (playErr) {
        console.warn('Audio autoplay blocked by browser:', playErr);
        if (isMountedRef.current) {
          setIsSpeaking(false);
          setAudioBlocked(true);
        }
      }
    } catch (error) {
      console.error('ElevenLabs TTS error, using browser voice fallback:', error);
      if (isMountedRef.current) {
        speakWithBrowserFallback(text);
      }
    }
  };

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    stopListening();

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        if (isMountedRef.current) setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const text = event.results?.[0]?.[0]?.transcript?.trim();
        if (text) {
          submitUserAnswer(text);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (isMountedRef.current) setIsListening(false);
      };

      recognition.onend = () => {
        if (isMountedRef.current) setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Could not start speech recognition:', err);
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      stopAudio();
      startListening();
    }
  };

  const submitUserAnswer = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isThinking) return;

    stopAudio();
    stopListening();
    setTranscript((prev) => [...prev, { role: 'user', text: trimmed }]);
    setIsThinking(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/interviews/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          user_answer_text: trimmed,
        }),
      });

      if (!res.ok) {
        throw new Error(`Chat failed with status ${res.status}`);
      }

      const data = await res.json();
      if (isMountedRef.current) {
        setIsThinking(false);
        const nextQuestion =
          data.next_question_text || 'Thank you. Could you elaborate a bit more on that?';
        await handleAIResponse(nextQuestion);
      }
    } catch (error) {
      console.error('Chat Error:', error);
      if (isMountedRef.current) {
        setIsThinking(false);
      }
    }
  };

  const handleAIResponse = async (text: string) => {
    lastAITextRef.current = text;
    setTranscript((prev) => [...prev, { role: 'ai', text }]);
    await playElevenLabsSpeech(text);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isThinking) return;
    const msg = textInput;
    setTextInput('');
    submitUserAnswer(msg);
  };

  const endSession = async () => {
    cleanupMedia();

    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/interviews/sessions/${sessionId}/complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error marking session as complete:', error);
    }

    onFinish();
  };

  const statusLabel = isThinking
    ? 'Thinking...'
    : isSpeaking
      ? 'Speaking'
      : isListening
        ? 'Listening to you...'
        : 'Ready';

  return (
    <div className="fixed inset-0 z-50 bg-[#0d1117] flex justify-center overflow-hidden h-[100dvh]">
      <div className="w-full max-w-3xl h-full flex flex-col p-4 gap-4">
        {/* Top Stage Row */}
        <div className="flex-none w-full flex flex-row gap-4 h-[30vh] min-h-[160px] max-h-[360px]">
          {/* AI Interviewer Voice Stage */}
          <div className="flex-1 bg-[#161b22] border border-gray-800 rounded-lg overflow-hidden relative flex flex-col items-center justify-center p-4">
            <div className="relative flex items-center justify-center">
              {isSpeaking && (
                <div className="absolute size-28 rounded-full bg-[#1f6feb]/25 animate-ping" />
              )}
              <div
                className={`size-24 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isSpeaking
                    ? 'bg-[#1f6feb]/30 border-[#58a6ff] scale-110'
                    : isThinking
                      ? 'bg-[#8250df]/20 border-[#bc8cff]'
                      : isListening
                        ? 'bg-[#238636]/20 border-[#3fb950]'
                        : 'bg-[#0d1117] border-gray-700'
                }`}
              >
                {isThinking ? (
                  <Loader2 className="size-10 text-[#bc8cff] animate-spin" />
                ) : (
                  <Brain
                    className={`size-10 transition-colors ${
                      isSpeaking
                        ? 'text-[#58a6ff]'
                        : isListening
                          ? 'text-[#3fb950]'
                          : 'text-gray-300'
                    }`}
                  />
                )}
              </div>
            </div>

            {audioBlocked && (
              <button
                onClick={() => playElevenLabsSpeech(lastAITextRef.current)}
                className="mt-4 px-3 py-1.5 bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs font-medium rounded-md flex items-center gap-1.5 cursor-pointer"
              >
                <Volume2 className="size-3.5" />
                Tap to play voice
              </button>
            )}

            <div className="absolute bottom-3 left-3 bg-[#0d1117]/80 backdrop-blur-sm text-white px-3 py-1 rounded-md text-xs flex items-center gap-2">
              <span
                className={`size-2 rounded-full ${
                  isSpeaking
                    ? 'bg-[#58a6ff] animate-pulse'
                    : isListening
                      ? 'bg-[#3fb950] animate-pulse'
                      : isThinking
                        ? 'bg-[#bc8cff] animate-pulse'
                        : 'bg-gray-400'
                }`}
              />
              <span>HireSync AI • {statusLabel}</span>
            </div>
          </div>

          {/* User Video */}
          <div className="flex-1 bg-[#161b22] border border-gray-800 rounded-lg overflow-hidden relative flex items-center justify-center">
            <video
              ref={userVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isCameraOn ? '' : 'hidden'}`}
            />
            {!isCameraOn && (
              <div className="flex flex-col items-center gap-2 text-gray-500">
                <VideoOff className="size-8" />
                <span className="text-xs">Camera off</span>
              </div>
            )}
            <div className="absolute bottom-3 left-3 bg-[#0d1117]/80 backdrop-blur-sm text-white px-3 py-1 rounded-md text-xs">
              You
            </div>
          </div>
        </div>

        {/* Live Transcript */}
        <div className="flex-1 w-full bg-[#161b22] border border-gray-800 rounded-lg flex flex-col min-h-0 overflow-hidden">
          <div className="flex-none p-3 border-b border-gray-800 bg-[#161b22] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="size-4 text-[#58a6ff]" />
              <span className="text-white font-semibold text-sm">Live Transcript</span>
            </div>
            <span className="text-xs text-gray-400">Powered by ElevenLabs Voice</span>
          </div>

          <div ref={transcriptRef} className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth">
            {transcript.length === 0 ? (
              <div className="text-gray-500 text-center text-sm italic mt-4">
                Conversation will appear here...
              </div>
            ) : (
              transcript.map((t, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg ${
                    t.role === 'user'
                      ? 'bg-[#1f6feb]/20 text-white ml-6'
                      : 'bg-[#238636]/20 text-white mr-6'
                  }`}
                >
                  <strong className="block text-xs opacity-70 mb-1">
                    {t.role === 'user' ? 'You' : 'HireSync Interviewer'}
                  </strong>
                  <div className="break-words whitespace-normal text-sm">{t.text}</div>
                </div>
              ))
            )}
            {isThinking && (
              <div className="p-3 rounded-lg bg-[#8250df]/15 text-gray-300 mr-6 flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin text-[#bc8cff]" />
                <span>Evaluating your answer and preparing the next question...</span>
              </div>
            )}
          </div>

          {/* Text Answer Fallback Input */}
          <form onSubmit={handleTextSubmit} className="flex-none p-3 border-t border-gray-800 flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              disabled={isThinking}
              placeholder={
                isListening
                  ? 'Listening via microphone... or type your answer here'
                  : 'Type your answer or tap the mic button to speak...'
              }
              className="flex-1 px-3 py-2 bg-[#0d1117] border border-gray-700 rounded-md text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-[#58a6ff]"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || isThinking}
              className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-40 text-white rounded-md text-sm font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="size-4" />
              Send
            </button>
          </form>
        </div>

        {/* Controls */}
        <div className="flex-none flex gap-3 justify-center items-center">
          <button
            onClick={toggleListening}
            title={isListening ? 'Stop listening' : 'Start speaking'}
            className={`p-4 rounded-full text-white transition-colors cursor-pointer ${
              isListening ? 'bg-[#238636] hover:bg-[#2ea043]' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isListening ? <Mic className="size-6" /> : <MicOff className="size-6" />}
          </button>

          <button
            onClick={toggleCamera}
            title={isCameraOn ? 'Turn camera off' : 'Turn camera on'}
            className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-colors cursor-pointer"
          >
            {isCameraOn ? <Video className="size-6" /> : <VideoOff className="size-6" />}
          </button>

          <button
            onClick={() => setIsMuted((m) => !m)}
            title={isMuted ? 'Unmute AI voice' : 'Mute AI voice'}
            className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="size-6" /> : <Volume2 className="size-6" />}
          </button>

          <button
            onClick={endSession}
            className="px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-full font-semibold flex items-center gap-2 cursor-pointer"
          >
            <Phone className="size-5 rotate-135" /> End Interview
          </button>
        </div>
      </div>
    </div>
  );
}
