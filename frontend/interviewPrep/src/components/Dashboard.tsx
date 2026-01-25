import { Link, useNavigate } from 'react-router';
import { Brain, LogOut, Calendar, CheckCircle, Circle, Plus, User, Loader2, ChevronDown, X } from 'lucide-react';
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
          fetch('http://localhost:8000/api/jobs', { headers }),
          fetch('http://localhost:8000/api/interviews/history', { headers })
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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
            <div className="flex items-center gap-2">
              <Brain className="size-8 text-[#0969da]" />
              <span className="font-semibold text-xl text-[#1f2328]">InterviewPrep</span>
            </div>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d0d7de]">
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-[#656d76]">
                        No active job applications found. Click "Add Interview" to get started.
                      </td>
                    </tr>
                  ) : jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="hover:bg-[#f6f8fa] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <Link to={`/interview/${job.id}`} className="font-semibold text-[#1f2328] hover:text-[#0969da] hover:underline">
                          {job.company}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <Link to={`/interview/${job.id}`} className="text-[#656d76] hover:text-[#1f2328]">
                          {job.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-[#656d76]">
                          <Calendar className="size-4" />
                          <span className="text-sm">{formatDate(job.created_at)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-md text-sm font-medium ${
                          (job.matchScore || 0) >= 80 ? 'bg-[#dafbe1] text-[#1a7f37] border border-[#1a7f37]/30' :
                          (job.matchScore || 0) >= 50 ? 'bg-[#fff8c5] text-[#9a6700] border border-[#9a6700]/30' :
                          'bg-[#f6f8fa] text-[#656d76] border border-[#d0d7de]'
                        }`}>
                          {job.matchScore ? `${job.matchScore}% Match` : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Circle className="size-4 text-[#9a6700] fill-[#9a6700]" />
                          <span className="text-sm text-[#656d76]">{job.status}</span>
                        </div>
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
              interviews.map((session) => (
                <div
                  key={session.id}
                  className="bg-white border border-[#d0d7de] rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedSessionId(expandedSessionId === session.id ? null : session.id)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#f6f8fa] transition-colors"
                  >
                    <div className="flex items-center gap-6 flex-1 text-left">
                      <div className="flex-1">
                        <div className="font-semibold text-[#1f2328]">{session.company || 'Unknown Company'}</div>
                        <div className="text-sm text-[#656d76]">{session.job_title || 'General Practice'}</div>
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
                    <ChevronDown
                      className={`size-5 text-[#656d76] transition-transform ${
                        expandedSessionId === session.id ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Expanded Transcript View */}
                  {expandedSessionId === session.id && session.transcript && session.transcript.length > 0 && (
                    <div className="border-t border-[#d0d7de] p-6 bg-[#f6f8fa]">
                      <h4 className="font-semibold text-[#1f2328] mb-4">Interview Transcript</h4>
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {session.transcript.map((entry, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-md ${
                              entry.role === 'user'
                                ? 'bg-[#ddf4ff] border border-[#54aeff] text-[#1f2328]'
                                : 'bg-[#dafbe1] border border-[#56d364] text-[#1f2328]'
                            }`}
                          >
                            <div className="font-semibold text-sm mb-1">
                              {entry.role === 'user' ? '👤 You' : '🤖 Interviewer'}
                            </div>
                            <div className="text-sm whitespace-pre-wrap break-words">
                              {entry.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}