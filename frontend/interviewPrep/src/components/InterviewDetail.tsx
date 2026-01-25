import { Link, useParams, useNavigate } from 'react-router';
import { Brain, ArrowLeft, Calendar, Briefcase, MapPin, DollarSign, Play, Building2, FileText, CheckSquare } from 'lucide-react';
import { mockInterviews, prepQuestions } from '../lib/mockData';
import { useState } from 'react';

type TopicCategory = 'technical' | 'behavioral' | 'leetcode';

export function InterviewDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const interview = mockInterviews.find((i) => i.id === id);
  const [selectedCategory, setSelectedCategory] = useState<TopicCategory>('technical');

  if (!interview) {
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
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getCurrentTopics = () => {
    switch (selectedCategory) {
      case 'technical':
        return interview.technicalTopics || [];
      case 'behavioral':
        return interview.behavioralTopics || [];
      case 'leetcode':
        return interview.leetcodeTopics || [];
      default:
        return [];
    }
  };

  const currentTopics = getCurrentTopics();

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
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-[#1f2328] mb-2">
                {interview.position}
              </h1>
              <p className="text-xl text-[#656d76]">{interview.company}</p>
            </div>
            <span
              className={`px-4 py-2 rounded-md text-sm font-medium border ${
                interview.completed
                  ? 'bg-[#dafbe1] text-[#1a7f37] border-[#1a7f37]/30'
                  : 'bg-[#fff8c5] text-[#9a6700] border-[#9a6700]/30'
              }`}
            >
              {interview.completed ? 'Completed' : 'Upcoming'}
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="flex items-center gap-3">
              <Calendar className="size-5 text-[#656d76]" />
              <div>
                <p className="text-sm text-[#656d76]">Interview Date</p>
                <p className="font-medium text-[#1f2328]">
                  {formatDate(interview.date)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Briefcase className="size-5 text-[#656d76]" />
              <div>
                <p className="text-sm text-[#656d76]">Interview Type</p>
                <p className="font-medium text-[#1f2328] capitalize">
                  {interview.type}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="size-5 text-[#656d76]" />
              <div>
                <p className="text-sm text-[#656d76]">Location</p>
                <p className="font-medium text-[#1f2328]">Remote</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DollarSign className="size-5 text-[#656d76]" />
              <div>
                <p className="text-sm text-[#656d76]">Salary Range</p>
                <p className="font-medium text-[#1f2328]">$120k - $180k</p>
              </div>
            </div>
          </div>

          {!interview.completed && (
            <button
              onClick={() => navigate(`/simulate/${interview.id}`)}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#1a7f37] text-white rounded-md hover:bg-[#1f883d] font-medium transition-colors"
            >
              <Play className="size-5" />
              Start AI Mock Interview
            </button>
          )}
        </div>

        {/* Job Listing Summary */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-[#1f2328]">
            Job Listing Summary
          </h2>

          {/* Description */}
          {interview.description && (
            <div className="bg-white border border-[#d0d7de] rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="size-5 text-[#0969da]" />
                <h3 className="text-xl font-semibold text-[#1f2328]">Description</h3>
              </div>
              <p className="text-[#1f2328] leading-relaxed">{interview.description}</p>
            </div>
          )}

          {/* Responsibilities */}
          {interview.responsibilities && interview.responsibilities.length > 0 && (
            <div className="bg-white border border-[#d0d7de] rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckSquare className="size-5 text-[#0969da]" />
                <h3 className="text-xl font-semibold text-[#1f2328]">Key Responsibilities</h3>
              </div>
              <ul className="space-y-3">
                {interview.responsibilities.map((responsibility, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-[#0969da] mt-1">•</span>
                    <span className="text-[#1f2328]">{responsibility}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Requirements */}
          {interview.requirements && interview.requirements.length > 0 && (
            <div className="bg-white border border-[#d0d7de] rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="size-5 text-[#0969da]" />
                <h3 className="text-xl font-semibold text-[#1f2328]">Requirements</h3>
              </div>
              <ul className="space-y-3">
                {interview.requirements.map((requirement, index) => (
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
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                selectedCategory === 'technical'
                  ? 'border-[#0969da] text-[#0969da]'
                  : 'border-transparent text-[#656d76] hover:text-[#1f2328]'
              }`}
            >
              Technical
            </button>
            <button
              onClick={() => setSelectedCategory('behavioral')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                selectedCategory === 'behavioral'
                  ? 'border-[#8250df] text-[#8250df]'
                  : 'border-transparent text-[#656d76] hover:text-[#1f2328]'
              }`}
            >
              Behavioral
            </button>
            <button
              onClick={() => setSelectedCategory('leetcode')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
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
            {currentTopics.length > 0 ? (
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
