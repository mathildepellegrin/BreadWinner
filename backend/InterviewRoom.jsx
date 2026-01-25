import React, { useState, useEffect, useRef } from 'react';
import StreamingAvatar, { AvatarQuality, TaskType } from '@heygentech/streaming-avatar';
import { Box, Button, Typography, Paper, Container, Grid } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';

const InterviewRoom = ({ sessionId, onFinish }) => {
  const [stream, setStream] = useState(null);
  const [debug, setDebug] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const avatarRef = useRef(null);
  const videoRef = useRef(null);
  const recognitionRef = useRef(null);

  // Configuration
  const AVATAR_ID = "default_avatar_id"; // Replace with specific ID if needed
  const VOICE_ID = "eleven_labs_voice_id"; // Replace with specific ID

  useEffect(() => {
    initAvatar();
    return () => {
      endSession();
    };
  }, []);

  const initAvatar = async () => {
    try {
      setIsLoading(true);
      // 1. Fetch Token
      const tokenRes = await fetch('http://localhost:8000/api/interviews/token');
      const { data: { token } } = await tokenRes.json();

      // 2. Init SDK
      avatarRef.current = new StreamingAvatar({ token });
      
      // 3. Start Avatar
      const eventData = await avatarRef.current.createStartAvatar({
        quality: AvatarQuality.Low,
        avatarName: AVATAR_ID,
        voice: { voiceId: VOICE_ID }
      });

      // 4. Handle Stream
      avatarRef.current.on('STREAM_READY', (event) => {
        setStream(event.detail);
        if (videoRef.current) {
          videoRef.current.srcObject = event.detail;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch(console.error);
          };
        }
      });

      avatarRef.current.on('avatar_stop_talking', () => {
        startListening();
      });

      setIsLoading(false);
      // Start the interview with an intro
      handleAIResponse("Hello! I'm your interviewer today. Let's get started. Tell me about yourself.");

    } catch (error) {
      console.error("Avatar Init Failed:", error);
      setDebug("Failed to initialize avatar.");
      setIsLoading(false);
    }
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Browser does not support speech recognition.");
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setTranscript(prev => [...prev, { role: 'user', text }]);
      sendAnswer(text);
    };

    recognition.onerror = (event) => {
      console.error("Speech error", event);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const sendAnswer = async (text) => {
    try {
      const res = await fetch('http://localhost:8000/api/interviews/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const handleAIResponse = async (text) => {
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
    if (onFinish) onFinish();
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, height: '80vh' }}>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        {/* Left: Avatar */}
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ height: '100%', position: 'relative', overflow: 'hidden', bgcolor: 'black' }}>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
            {isLoading && <Typography sx={{ color: 'white', position: 'absolute', top: '50%', left: '50%' }}>Loading Avatar...</Typography>}
          </Paper>
        </Grid>

        {/* Right: Transcript & Controls */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
            <Typography variant="h6" gutterBottom>Live Transcript</Typography>
            <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2 }}>
              {transcript.map((t, i) => (
                <Box key={i} sx={{ mb: 1, textAlign: t.role === 'user' ? 'right' : 'left' }}>
                  <Typography variant="body2" color={t.role === 'user' ? 'primary' : 'textSecondary'}>
                    <strong>{t.role === 'user' ? 'You' : 'Interviewer'}:</strong> {t.text}
                  </Typography>
                </Box>
              ))}
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
              <Button variant="contained" color={isListening ? "error" : "primary"} startIcon={isListening ? <MicIcon /> : <MicOffIcon />}>
                {isListening ? "Listening..." : "Processing"}
              </Button>
              <Button variant="outlined" color="error" onClick={endSession}>End Interview</Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default InterviewRoom;
