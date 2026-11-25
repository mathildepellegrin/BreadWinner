import { Link, useParams, useNavigate } from 'react-router';
import { Brain, ArrowLeft, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import InterviewRoom from './InterviewRoom';

type InterviewType = 'technical' | 'behavioral' | 'leetcode';

export function AISimulation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<InterviewType[]>(['technical']);
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [interviewDuration, setInterviewDuration] = useState(0);
  const [sessionId, setSessionId] = useState<number | null>(null);
  
  // New state for real job data
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch real job details
  useEffect(() => {
    const fetchJob = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      if (!id) {
        setLoading(false);
        return;
      }
      
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/jobs/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setJob(data);
        }
      } catch (error) {
        console.error("Failed to fetch job details:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchJob();
  }, [id, navigate]);

  useEffect(() => {
    if (hasStarted) {
      // Simulate AI listening animation
      if (isRecording) {
        const interval = setInterval(() => {
          setIsListening((prev) => !prev);
        }, 1500);
        return () => clearInterval(interval);
      } else {
        setIsListening(false);
      }
    }
  }, [isRecording, hasStarted]);

  // Timer for interview duration
  useEffect(() => {
    if (hasStarted) {
      const timer = setInterval(() => {
        setInterviewDuration((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [hasStarted]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <Loader2 className="size-8 text-[#58a6ff] animate-spin" />
      </div>
    );
  }

  if (!job && id) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            Interview not found
          </h2>
          <Link to="/dashboard" className="text-[#58a6ff] hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartInterview = async () => {
    if (selectedTypes.length === 0) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/interviews/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          mode: selectedTypes.join(', '),
          job_id: id ? parseInt(id) : null
        })
      });
      if (res.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      if (!res.ok) throw new Error('Failed to create session');
      const data = await res.json();
      setSessionId(data.session_id);
      setHasStarted(true);
    } catch (error) {
      console.error("Failed to start session:", error);
    }
  };

  const handleEndInterview = () => {
    setHasStarted(false);
    setSessionId(null);
  };

  const toggleType = (type: InterviewType) => {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) {
        return prev.filter((t) => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const getInterviewTypeLabel = () => {
    if (selectedTypes.length === 0) return '';
    if (selectedTypes.length === 3) return 'Full';
    if (selectedTypes.length === 1) {
      return selectedTypes[0].charAt(0).toUpperCase() + selectedTypes[0].slice(1);
    }
    return selectedTypes.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' & ');
  };

  // Setup screen before interview starts
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-[#0d1117]">
        {/* Header */}
        <header className="bg-[#161b22] border-b border-gray-800">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="size-8 text-[#58a6ff]" />
                <span className="font-semibold text-xl text-white">
                  AI Interview Simulation
                </span>
              </div>
              <Link
                to={`/interview/${id}`}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="size-5" />
                <span>Back</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Setup Content */}
        <main className="container mx-auto px-6 py-12">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-3xl font-bold text-white mb-4">
                {job ? job.company : 'General Practice'} - {job ? job.title : 'Mock Interview'}
              </h1>
              <p className="text-gray-400 text-lg">
                Choose your interview type(s) and get ready to practice
              </p>
            </div>

            {/* Interview Type Selection */}
            <div className="bg-[#161b22] border border-gray-800 rounded-lg p-8 mb-8">
              <h2 className="text-xl font-semibold text-white mb-2">
                Select Interview Type(s)
              </h2>
              <p className="text-gray-400 text-sm mb-6">
                You can select one or multiple types
              </p>
              <div className="grid gap-4">
                <button
                  onClick={() => toggleType('technical')}
                  className={`p-6 rounded-lg border-2 transition-all text-left ${
                    selectedTypes.includes('technical')
                      ? 'border-[#58a6ff] bg-[#1f6feb]/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Technical Interview
                      </h3>
                      <p className="text-gray-400">
                        Practice coding problems, system design, and technical concepts
                      </p>
                    </div>
                    {selectedTypes.includes('technical') && (
                      <div className="size-6 rounded-full bg-[#58a6ff] flex items-center justify-center flex-shrink-0">
                        <svg className="size-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>

                <button
                  onClick={() => toggleType('behavioral')}
                  className={`p-6 rounded-lg border-2 transition-all text-left ${
                    selectedTypes.includes('behavioral')
                      ? 'border-[#bc8cff] bg-[#8250df]/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Behavioral Interview
                      </h3>
                      <p className="text-gray-400">
                        Practice STAR method responses and leadership principles
                      </p>
                    </div>
                    {selectedTypes.includes('behavioral') && (
                      <div className="size-6 rounded-full bg-[#bc8cff] flex items-center justify-center flex-shrink-0">
                        <svg className="size-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>

                <button
                  onClick={() => toggleType('leetcode')}
                  className={`p-6 rounded-lg border-2 transition-all text-left ${
                    selectedTypes.includes('leetcode')
                      ? 'border-[#d29922] bg-[#d29922]/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        LeetCode Practice
                      </h3>
                      <p className="text-gray-400">
                        Solve algorithm and data structure problems with guidance
                      </p>
                    </div>
                    {selectedTypes.includes('leetcode') && (
                      <div className="size-6 rounded-full bg-[#d29922] flex items-center justify-center flex-shrink-0">
                        <svg className="size-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-[#161b22] border border-gray-800 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">
                Interview Tips
              </h3>
              <ul className="space-y-3 text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-[#58a6ff]">•</span>
                  <span>The interview will start immediately - make sure you're ready</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#58a6ff]">•</span>
                  <span>Your microphone will be automatically enabled when you start</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#58a6ff]">•</span>
                  <span>Take your time to think before answering - there's no rush</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#58a6ff]">•</span>
                  <span>Use the STAR method for behavioral questions (Situation, Task, Action, Result)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#58a6ff]">•</span>
                  <span>The AI will adapt questions based on your responses</span>
                </li>
              </ul>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartInterview}
              disabled={selectedTypes.length === 0}
              className="w-full py-4 bg-[#238636] text-white rounded-lg hover:bg-[#2ea043] font-semibold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#238636]"
            >
              {selectedTypes.length === 0 
                ? 'Select at least one interview type'
                : `Start ${getInterviewTypeLabel()} Interview`
              }
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Active interview screen
  return (
    <div className="min-h-screen bg-[#010409] flex flex-col">
      {sessionId && <InterviewRoom sessionId={sessionId} onFinish={handleEndInterview} />}
    </div>
  );
}