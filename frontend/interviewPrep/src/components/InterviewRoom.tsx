import React, { useState, useEffect, useRef } from 'react';
import StreamingAvatar, { AvatarQuality, TaskType, StreamingEvents } from '@heygen/streaming-avatar';
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
  const [sessionState, setSessionState] = useState<'loading' | 'active' | 'finished'>('loading');
  const [transcript, setTranscript] = useState<{ role: string; text: string }[]>([]);
  
  const avatarRef = useRef<StreamingAvatar | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const userVideoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null);
  const userStreamRef = useRef<MediaStream | null>(null);

  // Configuration - Use default avatar (empty string) which works
  const DEFAULT_AVATAR = "Wayne_20240711";
  const [currentAvatarIndex, setCurrentAvatarIndex] = useState(0);

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
      userStreamRef.current = stream;
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
      
      // 1. Fetch Token from our backend
      const tokenRes = await fetch('http://localhost:8000/api/interviews/token', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!tokenRes.ok) {
        const errorData = await tokenRes.json();
        throw new Error(`Failed to get HeyGen token: ${tokenRes.status} - ${JSON.stringify(errorData)}`);
      }
      
      const tokenData = await tokenRes.json();
      console.log('✅ Token response from backend:', tokenData);
      
      // 2. Init SDK with HeyGen token
      // HeyGen API returns { data: { token: "..." } }
      const heygenToken = tokenData.data?.token;
      if (!heygenToken) {
        console.error('❌ Invalid token structure:', tokenData);
        throw new Error(`Invalid token structure. Received: ${JSON.stringify(tokenData)}`);
      }
      console.log('✅ HeyGen token extracted:', heygenToken.substring(0, 20) + '...');
      
      avatarRef.current = new StreamingAvatar({ token: heygenToken });
      console.log('✅ StreamingAvatar initialized');
      
      // 3.5. Register event listeners BEFORE starting avatar
      avatarRef.current.on(StreamingEvents.STREAM_READY, (event: any) => {
        console.log('📡 STREAM_READY event:', event.detail);
        const mediaStream = event.detail;
        
        // Check if stream has audio tracks
        const audioTracks = mediaStream.getAudioTracks();
        const videoTracks = mediaStream.getVideoTracks();
        console.log(`🔊 Audio tracks: ${audioTracks.length}, Video tracks: ${videoTracks.length}`);
        audioTracks.forEach((track, idx) => {
          console.log(`  Audio track ${idx}:`, { enabled: track.enabled, readyState: track.readyState, label: track.label });
        });
        
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            console.log('✅ Video metadata loaded, attempting to play...');
            videoRef.current?.play().catch(error => {
              console.error('❌ Play error:', error);
            });
          };
        }
      });

      avatarRef.current.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
        startListening();
      });
      
      // 3. Start Avatar with default avatar
      console.log('📝 Starting avatar session...');
      try {
        const result = await avatarRef.current.createStartAvatar({
          avatarName: DEFAULT_AVATAR,
          quality: 'low',
          disableIdleTimeout: true,
        });
        console.log(`✅ Avatar created successfully`, result);
        setIsLoading(false);
        setSessionState('active');

        // Greet the user
        await handleAIResponse("Hello! I'm your AI interviewer. Let's begin. Please introduce yourself.");
      } catch (error) {
        console.error('❌ Avatar creation failed:', error);
        setIsLoading(false);
      }

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
          user_answer_text: text
        })
      });
      
      const data = await res.json();
      handleAIResponse(data.next_question_text);
    } catch (error) {
      console.error("Chat Error:", error);
    }
  };

  const handleAIResponse = async (text: string) => {
    setTranscript(prev => [...prev, { role: 'ai', text }]);
    if (avatarRef.current) {
      try {
        console.log('🎤 Avatar speaking:', text);
        const result = await avatarRef.current.speak({ 
          text: text, 
          task_type: TaskType.REPEAT,
          task_mode: 'sync' // Wait for speaking to complete
        });
        console.log('✅ Avatar finished speaking', result);
      } catch (error) {
        console.error('❌ Avatar speak error:', error);
      }
    }
  };

  const endSession = async () => {
    if (avatarRef.current) {
      await avatarRef.current.stopAvatar();
      avatarRef.current = null;
    }

    // Stop user camera tracks immediately
    if (userStreamRef.current) {
      userStreamRef.current.getTracks().forEach(track => track.stop());
      userStreamRef.current = null;
    }
    
    // Mark session as completed in backend
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:8000/api/interviews/sessions/${sessionId}/complete`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const data = await response.json();
      console.log('✅ Interview session completed:', data);
    } catch (error) {
      console.error('❌ Error marking session as complete:', error);
    }
    
    setSessionState('finished');
    onFinish();
  };

  return (
    <div className="flex-1 p-6 flex items-center justify-center flex-col">
      <div className="w-full max-w-7xl grid lg:grid-cols-3 gap-6 mb-6 h-[75vh]">
        {/* AI Avatar - Left (Larger) */}
        <div className="lg:col-span-2 bg-[#161b22] border border-gray-800 rounded-lg overflow-hidden relative h-full">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted={false}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            className="w-full h-full object-cover" 
          />
          {(isLoading || sessionState === 'loading') && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
              <div className="flex flex-col items-center gap-2">
                <div className="size-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Initializing AI Interviewer...</span>
              </div>
            </div>
          )}
          <div className="absolute bottom-4 left-4 bg-[#0d1117]/80 backdrop-blur-sm text-white px-3 py-1 rounded-md text-sm">
            AI Interviewer
          </div>
        </div>

        {/* Right Column: User Video + Transcript */}
        <div className="flex flex-col gap-4 h-full">
          {/* User Video - Small Overlay style */}
          <div className="bg-[#161b22] border border-gray-800 rounded-lg overflow-hidden aspect-video relative h-48 flex-shrink-0">
            <video ref={userVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute bottom-2 left-2 bg-[#0d1117]/80 backdrop-blur-sm text-white px-2 py-0.5 rounded text-xs">
              You
            </div>
          </div>

          {/* Live Transcript */}
          <div className="flex-1 bg-[#161b22] border border-gray-800 rounded-lg p-4 overflow-y-auto flex flex-col">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Brain className="size-4 text-[#58a6ff]" /> Live Transcript
            </h3>
            <div className="space-y-3 text-sm">
              {transcript.map((t, i) => (
                <div key={i} className={`p-2 rounded ${t.role === 'user' ? 'bg-[#1f6feb]/20 text-white ml-4' : 'bg-[#238636]/20 text-white mr-4'}`}>
                  <strong className="block text-xs opacity-70 mb-1">{t.role === 'user' ? 'You' : 'Interviewer'}</strong>
                  {t.text}
                </div>
              ))}
            </div>
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
    </div>
  );
}