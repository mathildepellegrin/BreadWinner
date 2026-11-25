import { Link, useNavigate } from 'react-router';
import { Brain, LogOut, Calendar, CheckCircle, Circle, Plus, User, Loader2, ChevronDown, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Job {
  id: number;
  title: string;
  company: string;
  status: string;
  matchScore: number | null;
  url: string | null;
  created_at: string;
}

interface InterviewSession {
  id: number;
  mode: string;
  completed: boolean;
  job_title: string | null;
  company: string | null;
  created_at: string;
  transcript?: { role: string; content: string }[];
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function Dashboard() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [interviews, setInterviews] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSessionId, setExpandedSessionId] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const headers = { 'Authorization': `Bearer ${token}` };

        const [jobsRes, interviewsRes] = await Promise.all([
          fetch(`${API_URL}/api/jobs`, { headers }),
          fetch(`${API_URL}/api/interviews/history`, { headers })
        ]);

        if (jobsRes.status === 401 || interviewsRes.status === 401) {
          handleLogout();
          return;
        }

        setJobs(await jobsRes.json());
        setInterviews(await interviewsRes.json());
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleDeleteJob = async (e: React.MouseEvent, jobId: number) => {
    e.stopPropagation();
    if (!window.confirm('Delete this job application?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/jobs/${jobId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
      }
    } catch (error) {
      console.error('Failed to delete job:', error);
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: number) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/interviews/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setInterviews((prev) => prev.filter((s) => s.id !== sessionId));
        if (expandedSessionId === sessionId) {
          setExpandedSessionId(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete interview session:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusDotClass = (status: string) => {
    switch (status) {
      case 'Offer':
        return 'text-[#1a7f37] fill-[#1a7f37]';
      case 'Rejected':
        return 'text-[#cf222e] fill-[#cf222e]';
      case 'Interviewing':
        return 'text-[#0969da] fill-[#0969da]';
      default:
        return 'text-[#9a6700] fill-[#9a6700]';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f8fa] flex items-center justify-center">
        <Loader2 className="size-8 text-[#0969da] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f8fa]">
      {/* Header */}
      <header className="bg-white border-b border-[#d0d7de]">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Brain className="size-8 text-[#0969da]" />
              <span className="font-semibold text-xl text-[#1f2328]">HireSync</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                to="/profile"
                className="flex items-center gap-2 text-[#656d76] hover:text-[#1f2328] transition-colors"
              >
                <User className="size-5" />
                <span>Profile</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-[#656d76] hover:text-[#1f2328] transition-colors cursor-pointer"
              >
                <LogOut className="size-5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#1f2328] mb-2">
              Interview Dashboard
            </h1>
            <p className="text-[#656d76]">
              Track your upcoming interviews and preparation progress
            </p>
          </div>
          <Link
            to="/add-interview"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#1a7f37] text-white rounded-md hover:bg-[#1f883d] font-medium transition-colors"
          >
            <Plus className="size-5" />
            Add Interview
          </Link>
        </div>

        {/* Active Job Applications */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="size-6 text-[#0969da]" />
            <h2 className="text-2xl font-semibold text-[#1f2328]">
              Active Applications
            </h2>
            <span className="bg-[#ddf4ff] text-[#0969da] px-2 py-1 rounded-full text-sm border border-[#54aeff]/30">
              {jobs.length}
            </span>
          </div>

          <div className="bg-white border border-[#d0d7de] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#d0d7de] bg-[#f6f8fa]">
                    <th className="text-left px-6 py-3 text-sm font-semibold text-[#656d76]">Company</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-[#656d76]">Position</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-[#656d76]">Applied</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-[#656d76]">Match</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-[#656d76]">Status</th>
                    <th className="text-right px-6 py-3 text-sm font-semibold text-[#656d76]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d0d7de]">
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-[#656d76]">
                        No active job applications found. Click "Add Interview" to get started.
                      </td>
                    </tr>
                  ) : jobs.map((job) => (
                    <tr
                      key={job.id}
                      onClick={() => navigate(`/interview/${job.id}`)}
                      className="hover:bg-[#f6f8fa] transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 font-semibold text-[#1f2328]">
                        {job.company}
                      </td>
                      <td className="px-6 py-4 text-[#656d76]">
                        {job.title}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-[#656d76]">
                          <Calendar className="size-4" />
                          <span className="text-sm">{formatDate(job.created_at)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-md text-sm font-medium ${
                          job.matchScore !== null && job.matchScore >= 80 ? 'bg-[#dafbe1] text-[#1a7f37] border border-[#1a7f37]/30' :
                          job.matchScore !== null && job.matchScore >= 50 ? 'bg-[#fff8c5] text-[#9a6700] border border-[#9a6700]/30' :
                          job.matchScore !== null ? 'bg-[#ffebe9] text-[#cf222e] border border-[#cf222e]/30' :
                          'bg-[#f6f8fa] text-[#656d76] border border-[#d0d7de]'
                        }`}>
                          {job.matchScore !== null && job.matchScore !== undefined ? `${job.matchScore}% Match` : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Circle className={`size-3.5 ${getStatusDotClass(job.status)}`} />
                          <span className="text-sm text-[#656d76]">{job.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteJob(e, job.id)}
                          title="Delete application"
                          className="p-1.5 text-[#656d76] hover:text-[#cf222e] rounded hover:bg-[#ffebe9] transition-colors cursor-pointer"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Interview History */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="size-6 text-[#1a7f37]" />
            <h2 className="text-2xl font-semibold text-[#1f2328]">
              Interview History
            </h2>
            <span className="bg-[#dafbe1] text-[#1a7f37] px-2 py-1 rounded-full text-sm border border-[#1a7f37]/30">
              {interviews.length}
            </span>
          </div>

          <div className="space-y-2">
            {interviews.length === 0 ? (
              <div className="bg-white border border-[#d0d7de] rounded-lg px-6 py-8 text-center text-[#656d76]">
                No interview sessions recorded yet.
              </div>
            ) : (
              interviews.map((session) => {
                const hasMessages = Array.isArray(session.transcript) && session.transcript.length > 0;
                const isExpanded = expandedSessionId === session.id;
                return (
                  <div
                    key={session.id}
                    className="bg-white border border-[#d0d7de] rounded-lg overflow-hidden"
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setExpandedSessionId(isExpanded ? null : session.id);
                        }
                      }}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#f6f8fa] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-6 flex-1 text-left">
                        <div className="flex-1">
                          <div className="font-semibold text-[#1f2328]">{session.company || 'General Practice'}</div>
                          <div className="text-sm text-[#656d76]">{session.job_title || 'Mock Interview'}</div>
                        </div>
                        <div className="text-sm text-[#656d76]">{formatDate(session.created_at)}</div>
                        <span className="inline-block px-3 py-1 bg-[#f6f8fa] text-[#656d76] border border-[#d0d7de] rounded-md text-sm capitalize">
                          {session.mode}
                        </span>
                        <div className="flex items-center gap-2">
                          {session.completed ? (
                            <>
                              <CheckCircle className="size-4 text-[#1a7f37]" />
                              <span className="text-sm text-[#656d76]">Completed</span>
                            </>
                          ) : (
                            <>
                              <Circle className="size-4 text-[#9a6700]" />
                              <span className="text-sm text-[#656d76]">In Progress</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(e, session.id)}
                          title="Delete session"
                          className="p-1.5 text-[#656d76] hover:text-[#cf222e] rounded hover:bg-[#ffebe9] transition-colors cursor-pointer"
                        >
                          <Trash2 className="size-4" />
                        </button>
                        <ChevronDown
                          className={`size-5 text-[#656d76] transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </div>

                    {/* Expanded Transcript View (also handles empty sessions clearly) */}
                    {isExpanded && (
                      <div className="border-t border-[#d0d7de] p-6 bg-[#f6f8fa]">
                        <h4 className="font-semibold text-[#1f2328] mb-4">Interview Transcript</h4>
                        {hasMessages ? (
                          <div className="space-y-4 max-h-96 overflow-y-auto">
                            {session.transcript!.map((entry, idx) => (
                              <div
                                key={idx}
                                className={`p-3 rounded-md ${
                                  entry.role === 'user'
                                    ? 'bg-[#ddf4ff] border border-[#54aeff] text-[#1f2328]'
                                    : 'bg-[#dafbe1] border border-[#56d364] text-[#1f2328]'
                                }`}
                              >
                                <div className="font-semibold text-sm mb-1">
                                  {entry.role === 'user' ? 'You' : 'HireSync Interviewer'}
                                </div>
                                <div className="text-sm whitespace-pre-wrap break-words">
                                  {entry.content}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-[#656d76] italic">
                            This interview chat is empty — no answers were recorded during this session.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
