import { Link, useParams, useNavigate } from 'react-router';
import { Brain, ArrowLeft, Calendar, Briefcase, MapPin, DollarSign, Play, Building2, FileText, CheckSquare, Loader2, RefreshCw, AlertCircle, Target, ExternalLink, Trash2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

type TopicCategory = 'technical' | 'behavioral' | 'leetcode';

interface JobDetail {
  id: number;
  title: string;
  company: string;
  description: string;
  requirements: string[];
  benefits: string[];
  status: string;
  url: string | null;
  location: string | null;
  salary: string | null;
  interview_date: string | null;
  matchScore: number | null;
  gaps: string[] | null;
  created_at: string;
}

interface PrepMaterials {
  technical_topics: string[];
  behavioral_topics: string[];
  leetcode_topics: string[];
}

interface JobAnalysis {
  matchScore: number | null;
  gaps: string[];
  strengths?: string[];
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function InterviewDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<TopicCategory>('technical');
  const [job, setJob] = useState<JobDetail | null>(null);
  const [prepMaterials, setPrepMaterials] = useState<PrepMaterials | null>(null);
  const [prepError, setPrepError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<JobAnalysis | null>(null);
  const [analysisNote, setAnalysisNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPrep, setLoadingPrep] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  const loadPrepMaterials = useCallback(async (jobId: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoadingPrep(true);
    setPrepError(null);
    try {
      const res = await fetch(`${API_URL}/api/prep/materials`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ job_id: jobId })
      });

      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      if (!res.ok) {
        throw new Error(data.error || data.detail || 'Failed to generate study materials');
      }
      setPrepMaterials(data);
    } catch (err) {
      console.error('Failed to load prep materials', err);
      setPrepMaterials(null);
      setPrepError(err instanceof Error ? err.message : 'Failed to load study materials');
    } finally {
      setLoadingPrep(false);
    }
  }, [navigate]);

  const loadJobAnalysis = useCallback(async (jobId: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoadingAnalysis(true);
    setAnalysisNote(null);
    try {
      const res = await fetch(`${API_URL}/api/jobs/${jobId}/analysis`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      if (res.status === 400 || data.needsProfile) {
        setAnalysisNote(data.message || data.error || data.detail || 'Upload a CV or fill out your Profile to see your match score.');
        return;
      }
      if (!res.ok) {
        throw new Error(data.error || data.detail || 'Failed to analyze match score');
      }
      setAnalysis({
        matchScore: data.matchScore ?? null,
        gaps: Array.isArray(data.gaps) ? data.gaps : [],
        strengths: Array.isArray(data.strengths) ? data.strengths : undefined,
      });
    } catch (err) {
      console.error('Failed to load job analysis', err);
    } finally {
      setLoadingAnalysis(false);
    }
  }, [navigate]);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const jobRes = await fetch(`${API_URL}/api/jobs/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (jobRes.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }
        if (!jobRes.ok) throw new Error('Job not found');
        const jobData: JobDetail = await jobRes.json();
        setJob(jobData);

        if (jobData.matchScore !== null && jobData.matchScore !== undefined) {
          setAnalysis({
            matchScore: jobData.matchScore,
            gaps: Array.isArray(jobData.gaps) ? jobData.gaps : [],
          });
        } else {
          void loadJobAnalysis(jobData.id);
        }

        void loadPrepMaterials(jobData.id);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchJob();
  }, [id, navigate, loadPrepMaterials, loadJobAnalysis]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f8fa] flex items-center justify-center">
        <Loader2 className="size-8 text-[#0969da] animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-[#f6f8fa] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#1f2328] mb-2">
            Interview not found
          </h2>
          <Link to="/dashboard" className="text-[#0969da] hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'Offer':
        return 'bg-[#dafbe1] text-[#1a7f37] border-[#1a7f37]/30';
      case 'Rejected':
        return 'bg-[#ffebe9] text-[#cf222e] border-[#cf222e]/30';
      case 'Interviewing':
        return 'bg-[#ddf4ff] text-[#0969da] border-[#0969da]/30';
      default:
        return 'bg-[#fff8c5] text-[#9a6700] border-[#9a6700]/30';
    }
  };

  const getCurrentTopics = () => {
    if (!prepMaterials) return [];
    switch (selectedCategory) {
      case 'technical':
        return prepMaterials.technical_topics || [];
      case 'behavioral':
        return prepMaterials.behavioral_topics || [];
      case 'leetcode':
        return prepMaterials.leetcode_topics || [];
      default:
        return [];
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!job) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/jobs/${job.id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setJob({ ...job, status: newStatus });
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleDeleteJob = async () => {
    if (!job || !window.confirm('Delete this job application?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/jobs/${job.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Failed to delete job:', error);
    }
  };

  const currentTopics = getCurrentTopics();

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
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-[#656d76] hover:text-[#1f2328] transition-colors"
            >
              <ArrowLeft className="size-5" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 max-w-5xl">
        {/* Job Header */}
        <div className="bg-white border border-[#d0d7de] rounded-lg p-8 mb-8">
          <div className="flex flex-wrap items-start justify-between mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#1f2328] mb-2">
                {job.title}
              </h1>
              <div className="flex items-center gap-3">
                <p className="text-xl text-[#656d76]">{job.company}</p>
                {job.url && (
                  <a
                    href={job.url.startsWith('http') ? job.url : `https://${job.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-[#0969da] hover:underline"
                  >
                    <span>Job Posting</span>
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {analysis?.matchScore !== null && analysis?.matchScore !== undefined && (
                <span
                  className={`px-4 py-2 rounded-md text-sm font-medium border ${
                    analysis.matchScore >= 80
                      ? 'bg-[#dafbe1] text-[#1a7f37] border-[#1a7f37]/30'
                      : analysis.matchScore >= 50
                        ? 'bg-[#fff8c5] text-[#9a6700] border-[#9a6700]/30'
                        : 'bg-[#ffebe9] text-[#cf222e] border-[#cf222e]/30'
                  }`}
                >
                  {analysis.matchScore}% Match
                </span>
              )}
              <select
                value={job.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                aria-label="Application status"
                className={`px-3 py-2 rounded-md text-sm font-medium border cursor-pointer focus:outline-none ${getStatusBadgeStyle(job.status)}`}
              >
                <option value="Applied">Applied</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Offer">Offer</option>
                <option value="Rejected">Rejected</option>
              </select>
              <button
                type="button"
                onClick={handleDeleteJob}
                title="Delete application"
                className="p-2 text-[#656d76] hover:text-[#cf222e] border border-[#d0d7de] rounded-md hover:bg-[#ffebe9] transition-colors cursor-pointer"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="flex items-center gap-3">
              <Calendar className="size-5 text-[#656d76]" />
              <div>
                <p className="text-sm text-[#656d76]">
                  {job.interview_date ? 'Interview Date' : 'Applied Date'}
                </p>
                <p className="font-medium text-[#1f2328]">
                  {formatDate(job.interview_date || job.created_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Briefcase className="size-5 text-[#656d76]" />
              <div>
                <p className="text-sm text-[#656d76]">Interview Type</p>
                <p className="font-medium text-[#1f2328] capitalize">
                  Technical & Behavioral
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="size-5 text-[#656d76]" />
              <div>
                <p className="text-sm text-[#656d76]">Location</p>
                <p className="font-medium text-[#1f2328]">{job.location || 'Not specified'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DollarSign className="size-5 text-[#656d76]" />
              <div>
                <p className="text-sm text-[#656d76]">Salary Range</p>
                <p className="font-medium text-[#1f2328]">{job.salary || 'Not specified'}</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate(`/simulate/${job.id}`)}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#1a7f37] text-white rounded-md hover:bg-[#1f883d] font-medium transition-colors cursor-pointer"
          >
            <Play className="size-5" />
            Start AI Mock Interview
          </button>
        </div>

        {/* Resume Match & Skill Gaps */}
        <div className="bg-white border border-[#d0d7de] rounded-lg p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Target className="size-5 text-[#0969da]" />
            <h2 className="text-xl font-semibold text-[#1f2328]">Resume Match & Gap Analysis</h2>
          </div>
          {loadingAnalysis ? (
            <div className="flex items-center gap-2 text-[#0969da] py-2">
              <Loader2 className="size-5 animate-spin" />
              <span>Analyzing your profile against this role...</span>
            </div>
          ) : analysisNote ? (
            <p className="text-sm text-[#656d76]">
              {analysisNote}{' '}
              <Link to="/profile" className="text-[#0969da] hover:underline font-medium">
                Go to Profile
              </Link>
            </p>
          ) : analysis ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#656d76]">Match Score:</span>
                <span className="font-bold text-lg text-[#1f2328]">{analysis.matchScore}%</span>
              </div>
              {analysis.gaps.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-[#1f2328] mb-2">Key Skill Gaps to Brush Up On:</p>
                  <ul className="space-y-2">
                    {analysis.gaps.map((gap, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-[#1f2328]">
                        <span className="text-[#9a6700] mt-0.5">•</span>
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-[#656d76]">Match analysis unavailable right now.</p>
          )}
        </div>

        {/* Job Listing Summary */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-[#1f2328]">
            Job Listing Summary
          </h2>

          {/* Description */}
          {job.description && (
            <div className="bg-white border border-[#d0d7de] rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="size-5 text-[#0969da]" />
                <h3 className="text-xl font-semibold text-[#1f2328]">Description</h3>
              </div>
              <p className="text-[#1f2328] leading-relaxed whitespace-pre-wrap">{job.description}</p>
            </div>
          )}

          {/* Benefits/Values (Mapped from benefits) */}
          {job.benefits && job.benefits.length > 0 && (
            <div className="bg-white border border-[#d0d7de] rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckSquare className="size-5 text-[#0969da]" />
                <h3 className="text-xl font-semibold text-[#1f2328]">Benefits & Values</h3>
              </div>
              <ul className="space-y-3">
                {job.benefits.map((responsibility, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-[#0969da] mt-1">•</span>
                    <span className="text-[#1f2328]">{responsibility}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Requirements */}
          {job.requirements && job.requirements.length > 0 && (
            <div className="bg-white border border-[#d0d7de] rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="size-5 text-[#0969da]" />
                <h3 className="text-xl font-semibold text-[#1f2328]">Requirements</h3>
              </div>
              <ul className="space-y-3">
                {job.requirements.map((requirement, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-[#0969da] mt-1">•</span>
                    <span className="text-[#1f2328]">{requirement}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Topics to Study */}
        <div className="mt-8 space-y-6">
          <h2 className="text-2xl font-bold text-[#1f2328]">
            Topics & Notions to Study
          </h2>

          {/* Category Tabs */}
          <div className="flex gap-2 border-b border-[#d0d7de]">
            <button
              onClick={() => setSelectedCategory('technical')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 cursor-pointer ${
                selectedCategory === 'technical'
                  ? 'border-[#0969da] text-[#0969da]'
                  : 'border-transparent text-[#656d76] hover:text-[#1f2328]'
              }`}
            >
              Technical
            </button>
            <button
              onClick={() => setSelectedCategory('behavioral')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 cursor-pointer ${
                selectedCategory === 'behavioral'
                  ? 'border-[#8250df] text-[#8250df]'
                  : 'border-transparent text-[#656d76] hover:text-[#1f2328]'
              }`}
            >
              Behavioral
            </button>
            <button
              onClick={() => setSelectedCategory('leetcode')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 cursor-pointer ${
                selectedCategory === 'leetcode'
                  ? 'border-[#9a6700] text-[#9a6700]'
                  : 'border-transparent text-[#656d76] hover:text-[#1f2328]'
              }`}
            >
              LeetCode
            </button>
          </div>

          {/* Topics List */}
          <div className="bg-white border border-[#d0d7de] rounded-lg p-6">
            <p className="text-[#656d76] mb-6">
              {selectedCategory === 'technical' && 'Key technical concepts and technologies you should review:'}
              {selectedCategory === 'behavioral' && 'Common behavioral questions and scenarios to prepare:'}
              {selectedCategory === 'leetcode' && 'Algorithm and data structure topics to practice on LeetCode:'}
            </p>
            {loadingPrep ? (
              <div className="flex items-center justify-center py-8 text-[#0969da]">
                <Loader2 className="size-6 animate-spin mr-2" /> Generating personalized study plan...
              </div>
            ) : prepError ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                <div className="flex items-center gap-2 text-[#cf222e] text-sm font-medium">
                  <AlertCircle className="size-5" />
                  <span>{prepError}</span>
                </div>
                <button
                  onClick={() => loadPrepMaterials(job.id)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#f6f8fa] hover:bg-[#eaeef2] border border-[#d0d7de] rounded-md text-sm font-medium text-[#1f2328] cursor-pointer"
                >
                  <RefreshCw className="size-4" />
                  Retry
                </button>
              </div>
            ) : currentTopics.length > 0 ? (
              <div className="grid gap-3">
                {currentTopics.map((topic, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                      selectedCategory === 'technical'
                        ? 'bg-[#ddf4ff] border-[#0969da]/30 hover:bg-[#b6e3ff]'
                        : selectedCategory === 'behavioral'
                        ? 'bg-[#fbefff] border-[#8250df]/30 hover:bg-[#f6d8ff]'
                        : 'bg-[#fff8c5] border-[#9a6700]/30 hover:bg-[#fae17d]'
                    }`}
                  >
                    <span
                      className={`flex-shrink-0 flex items-center justify-center size-8 rounded-md font-semibold text-sm ${
                        selectedCategory === 'technical'
                          ? 'bg-[#0969da]/20 text-[#0969da]'
                          : selectedCategory === 'behavioral'
                          ? 'bg-[#8250df]/20 text-[#8250df]'
                          : 'bg-[#9a6700]/20 text-[#9a6700]'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <p className="text-[#1f2328] pt-1 font-medium">{topic}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#656d76] text-center py-8">
                No {selectedCategory} topics available for this interview.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
