import React, { useState, useEffect, useRef } from 'react';
import StreamingAvatar, { AvatarQuality, TaskType } from '@heygentech/streaming-avatar';
import { Mic, MicOff, Video, VideoOff, Phone, Brain } from 'lucide-react';

interface InterviewRoomProps {
  sessionId: number;
  onFinish: () => void;
}

export default function InterviewRoom({ sessionId, onFinish }: InterviewRoomProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [transcript, setTranscript] = useState<{ role: string; text: string }[]>([]);
  
  const avatarRef = useRef<StreamingAvatar | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const userVideoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null);

  // Configuration - Replace with your specific IDs if needed
  const AVATAR_ID = "default_avatar_id"; 
  const VOICE_ID = "eleven_labs_voice_id";

  useEffect(() => {
    initAvatar();
    initUserCamera();
    return () => {
      endSession();
    };
  }, []);

  const initUserCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (userVideoRef.current) {
        userVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied:", err);
      setIsCameraOn(false);
    }
  };

  const initAvatar = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      // 1. Fetch Token
      const tokenRes = await fetch('http://localhost:8000/api/interviews/token', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await tokenRes.json();
      
      // 2. Init SDK
      avatarRef.current = new StreamingAvatar({ token: data.data.token });
      
      // 3. Start Avatar
      await avatarRef.current.createStartAvatar({
        quality: AvatarQuality.Low,
        avatarName: AVATAR_ID,
        voice: { voiceId: VOICE_ID }
      });

      // 4. Handle Stream
      avatarRef.current.on('STREAM_READY', (event: any) => {
        setStream(event.detail);
        if (videoRef.current) {
          videoRef.current.srcObject = event.detail;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(console.error);
          };
        }
      });

      avatarRef.current.on('avatar_stop_talking', () => {
        startListening();
      });

      setIsLoading(false);
      handleAIResponse("Hello! I'm your AI interviewer. Let's begin. Please introduce yourself.");

    } catch (error) {
      console.error("Avatar Init Failed:", error);
      setIsLoading(false);
    }
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) return;

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(prev => [...prev, { role: 'user', text }]);
      sendAnswer(text);
    };

    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const sendAnswer = async (text: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/interviews/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          session_id: sessionId,
          user_answer: text
        })
      });
      
      const data = await res.json();
      handleAIResponse(data.next_question);
    } catch (error) {
      console.error("Chat Error:", error);
    }
  };

  const handleAIResponse = async (text: string) => {
    setTranscript(prev => [...prev, { role: 'ai', text }]);
    if (avatarRef.current) {
      await avatarRef.current.speak({ text, task_type: TaskType.REPEAT });
    }
  };

  const endSession = async () => {
    if (avatarRef.current) {
      await avatarRef.current.stopAvatar();
      avatarRef.current = null;
    }
    onFinish();
  };

  return (
    <div className="flex-1 p-6 flex items-center justify-center flex-col">
      <div className="w-full max-w-7xl grid lg:grid-cols-2 gap-6 mb-6">
        {/* AI Avatar */}
        <div className="bg-[#161b22] border border-gray-800 rounded-lg overflow-hidden aspect-video relative">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
              Loading Avatar...
            </div>
          )}
          <div className="absolute bottom-4 left-4 bg-[#0d1117]/80 backdrop-blur-sm text-white px-3 py-1 rounded-md text-sm">
            AI Interviewer
          </div>
        </div>

        {/* User Video */}
        <div className="bg-[#161b22] border border-gray-800 rounded-lg overflow-hidden aspect-video relative">
          <video ref={userVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <div className="absolute bottom-4 left-4 bg-[#0d1117]/80 backdrop-blur-sm text-white px-3 py-1 rounded-md text-sm">
            You
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4">
        <button onClick={() => setIsListening(!isListening)} className={`p-4 rounded-full ${isListening ? 'bg-red-500' : 'bg-gray-700'} text-white`}>
          {isListening ? <Mic className="size-6" /> : <MicOff className="size-6" />}
        </button>
        <button onClick={endSession} className="px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-full font-semibold flex items-center gap-2">
          <Phone className="size-5 rotate-135" /> End Interview
        </button>
      </div>

      {/* Transcript Preview */}
      <div className="mt-6 w-full max-w-3xl h-32 overflow-y-auto bg-[#161b22] p-4 rounded border border-gray-800 text-gray-300 text-sm">
        {transcript.map((t, i) => (
          <div key={i} className={`mb-1 ${t.role === 'user' ? 'text-blue-400 text-right' : 'text-green-400'}`}>
            <strong>{t.role === 'user' ? 'You' : 'AI'}:</strong> {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}