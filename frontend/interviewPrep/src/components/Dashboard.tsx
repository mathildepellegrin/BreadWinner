import { Link } from "react-router";
import {
  Brain,
  LogOut,
  Calendar,
  CheckCircle,
  Circle,
  Plus,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getJobApplications, type Job } from "../../apis/jobsService";

export function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const jobsData = await getJobApplications();
        setJobs(jobsData);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load jobs";
        setError(errorMessage);
        console.error("Dashboard error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobs();
  }, []);

  // Categorize jobs by status
  const upcomingInterviews = jobs.filter(
    (job) => job.status === "Applied" || job.status === "Interviewing",
  );
  const completedInterviews = jobs.filter(
    (job) => job.status === "Offer" || job.status === "Rejected",
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Applied":
        return <Circle className="size-4 text-[#9a6700] fill-[#9a6700]" />;
      case "Interviewing":
        return <Circle className="size-4 text-[#0969da] fill-[#0969da]" />;
      case "Offer":
        return <CheckCircle className="size-4 text-[#1a7f37]" />;
      case "Rejected":
        return <Circle className="size-4 text-[#d1240a] fill-[#d1240a]" />;
      default:
        return <Circle className="size-4 text-[#656d76] fill-[#656d76]" />;
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "Applied":
        return "bg-[#fff8c5] text-[#9a6700] border-[#dca811]/30";
      case "Interviewing":
        return "bg-[#ddf4ff] text-[#0969da] border-[#54aeff]/30";
      case "Offer":
        return "bg-[#dafbe1] text-[#1a7f37] border-[#1a7f37]/30";
      case "Rejected":
        return "bg-[#ffebe6] text-[#d1240a] border-[#d1240a]/30";
      default:
        return "bg-[#f6f8fa] text-[#656d76] border-[#d0d7de]";
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
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
              <span className="font-semibold text-xl text-[#1f2328]">
                InterviewPrep
              </span>
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

          {isLoading ? (
            <div className="text-center py-8 text-[#656d76]">Loading...</div>
          ) : error ? (
            <div className="bg-[#ffebe6] border border-[#d1240a] text-[#d1240a] rounded-lg p-4">
              {error}
            </div>
          ) : upcomingInterviews.length === 0 ? (
            <div className="bg-white border border-[#d0d7de] rounded-lg p-8 text-center">
              <p className="text-[#656d76] mb-4">No upcoming interviews</p>
              <Link
                to="/add-interview"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a7f37] text-white rounded-md hover:bg-[#1f883d] font-medium transition-colors"
              >
                <Plus className="size-4" />
                Add Interview
              </Link>
            </div>
          ) : (
            <div className="bg-white border border-[#d0d7de] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#d0d7de] bg-[#f6f8fa]">
                      <th className="text-left px-6 py-3 text-sm font-semibold text-[#656d76]">
                        Company
                      </th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-[#656d76]">
                        Position
                      </th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-[#656d76]">
                        Date Applied
                      </th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-[#656d76]">
                        Match Score
                      </th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-[#656d76]">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d0d7de]">
                    {upcomingInterviews.map((job) => (
                      <tr
                        key={job.id}
                        className="hover:bg-[#f6f8fa] transition-colors"
                      >
                        <td className="px-6 py-4">
                          <Link
                            to={`/job/${job.id}`}
                            className="font-semibold text-[#1f2328] hover:text-[#0969da] transition-colors"
                          >
                            {job.company}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            to={`/job/${job.id}`}
                            className="text-[#656d76] hover:text-[#1f2328] transition-colors"
                          >
                            {job.title}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-[#656d76]">
                            <Calendar className="size-4" />
                            <span className="text-sm">
                              {formatDate(job.created_at)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {job.matchScore ? (
                            <span className="text-sm text-[#0969da] font-medium">
                              {job.matchScore}%
                            </span>
                          ) : (
                            <span className="text-sm text-[#656d76]">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(job.status)}
                            <span
                              className={`inline-block px-3 py-1 border rounded-md text-sm capitalize ${getStatusBadgeStyle(
                                job.status,
                              )}`}
                            >
                              {job.status}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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

          {completedInterviews.length === 0 ? (
            <div className="bg-white border border-[#d0d7de] rounded-lg p-8 text-center">
              <p className="text-[#656d76]">No completed interviews yet</p>
            </div>
          ) : (
            <div className="bg-white border border-[#d0d7de] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#d0d7de] bg-[#f6f8fa]">
                      <th className="text-left px-6 py-3 text-sm font-semibold text-[#656d76]">
                        Company
                      </th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-[#656d76]">
                        Position
                      </th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-[#656d76]">
                        Date Applied
                      </th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-[#656d76]">
                        Match Score
                      </th>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-[#656d76]">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d0d7de]">
                    {completedInterviews.map((job) => (
                      <tr
                        key={job.id}
                        className="hover:bg-[#f6f8fa] transition-colors"
                      >
                        <td className="px-6 py-4">
                          <Link
                            to={`/job/${job.id}`}
                            className="font-semibold text-[#656d76] hover:text-[#0969da] transition-colors"
                          >
                            {job.company}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            to={`/job/${job.id}`}
                            className="text-[#656d76] hover:text-[#1f2328] transition-colors"
                          >
                            {job.title}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-[#656d76]">
                            <Calendar className="size-4" />
                            <span className="text-sm">
                              {formatDate(job.created_at)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {job.matchScore ? (
                            <span className="text-sm text-[#0969da] font-medium">
                              {job.matchScore}%
                            </span>
                          ) : (
                            <span className="text-sm text-[#656d76]">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(job.status)}
                            <span
                              className={`inline-block px-3 py-1 border rounded-md text-sm capitalize ${getStatusBadgeStyle(
                                job.status,
                              )}`}
                            >
                              {job.status}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
