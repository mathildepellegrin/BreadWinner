import { Link } from 'react-router';
import { Brain, LogOut, Calendar, CheckCircle, Circle, Plus, User } from 'lucide-react';
import { mockInterviews } from '../lib/mockData';

export function Dashboard() {
  const upcomingInterviews = mockInterviews.filter((i) => !i.completed);
  const completedInterviews = mockInterviews.filter((i) => i.completed);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

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
              <Link
                to="/"
                className="flex items-center gap-2 text-[#656d76] hover:text-[#1f2328] transition-colors"
              >
                <LogOut className="size-5" />
                <span>Log Out</span>
              </Link>
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

        {/* Upcoming Interviews */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="size-6 text-[#0969da]" />
            <h2 className="text-2xl font-semibold text-[#1f2328]">
              Upcoming Interviews
            </h2>
            <span className="bg-[#ddf4ff] text-[#0969da] px-2 py-1 rounded-full text-sm border border-[#54aeff]/30">
              {upcomingInterviews.length}
            </span>
          </div>

          <div className="bg-white border border-[#d0d7de] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#d0d7de] bg-[#f6f8fa]">
                    <th className="text-left px-6 py-3 text-sm font-semibold text-[#656d76]">Company</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-[#656d76]">Position</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-[#656d76]">Date</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-[#656d76]">Type</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-[#656d76]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d0d7de]">
                  {upcomingInterviews.map((interview) => (
                    <tr
                      key={interview.id}
                      className="hover:bg-[#f6f8fa] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <Link
                          to={`/interview/${interview.id}`}
                          className="font-semibold text-[#1f2328] hover:text-[#0969da] transition-colors"
                        >
                          {interview.company}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          to={`/interview/${interview.id}`}
                          className="text-[#656d76] hover:text-[#1f2328] transition-colors"
                        >
                          {interview.position}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-[#656d76]">
                          <Calendar className="size-4" />
                          <span className="text-sm">{formatDate(interview.date)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 bg-[#ddf4ff] text-[#0969da] border border-[#54aeff]/30 rounded-md text-sm capitalize">
                          {interview.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Circle className="size-4 text-[#9a6700] fill-[#9a6700]" />
                          <span className="text-sm text-[#656d76]">Upcoming</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Completed Interviews */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="size-6 text-[#1a7f37]" />
            <h2 className="text-2xl font-semibold text-[#1f2328]">
              Completed Interviews
            </h2>
            <span className="bg-[#dafbe1] text-[#1a7f37] px-2 py-1 rounded-full text-sm border border-[#1a7f37]/30">
              {completedInterviews.length}
            </span>
          </div>

          <div className="bg-white border border-[#d0d7de] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#d0d7de] bg-[#f6f8fa]">
                    <th className="text-left px-6 py-3 text-sm font-semibold text-[#656d76]">Company</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-[#656d76]">Position</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-[#656d76]">Date</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-[#656d76]">Type</th>
                    <th className="text-left px-6 py-3 text-sm font-semibold text-[#656d76]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d0d7de]">
                  {completedInterviews.map((interview) => (
                    <tr
                      key={interview.id}
                      className="hover:bg-[#f6f8fa] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <Link
                          to={`/interview/${interview.id}`}
                          className="font-semibold text-[#656d76] hover:text-[#0969da] transition-colors"
                        >
                          {interview.company}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          to={`/interview/${interview.id}`}
                          className="text-[#656d76] hover:text-[#1f2328] transition-colors"
                        >
                          {interview.position}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-[#656d76]">
                          <Calendar className="size-4" />
                          <span className="text-sm">{formatDate(interview.date)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 bg-[#f6f8fa] text-[#656d76] border border-[#d0d7de] rounded-md text-sm capitalize">
                          {interview.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="size-4 text-[#1a7f37]" />
                          <span className="text-sm text-[#656d76]">Completed</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}