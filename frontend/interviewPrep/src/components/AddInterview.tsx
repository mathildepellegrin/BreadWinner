import { Link, useNavigate } from 'react-router';
import { Brain, ArrowLeft, Link2, Sparkles } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { createJobApplication, autoFillJobFromUrl } from '../../apis/jobsService';

export function AddInterview() {
  const navigate = useNavigate();
  const [jobUrl, setJobUrl] = useState('');
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  
  // Form fields
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewType, setInterviewType] = useState<'technical' | 'behavioral' | 'both'>('technical');
  const [location, setLocation] = useState('');
  const [salaryRange, setSalaryRange] = useState('');
  const [description, setDescription] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [requirements, setRequirements] = useState('');
  const [companyValues, setCompanyValues] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAutoFill = async () => {
    if (!jobUrl.trim()) return;
    
    setIsAutoFilling(true);
    
    try {
      const data = await autoFillJobFromUrl(jobUrl);
      
      // Fill form with auto-filled data
      setCompany(data.company);
      setPosition(data.title);
      setLocation(data.location);
      setSalaryRange(data.salaryRange);
      setDescription(data.description);
      setResponsibilities(data.responsibilities);
      setRequirements(data.requirements);
      setCompanyValues(data.benefits);
      setInterviewType(data.interviewType);
    } catch (error: any) {
      console.error('Auto-fill failed:', error);
      const errorMessage = error?.message || 'Failed to auto-fill from URL';
      
      if (errorMessage.includes('meaningful content')) {
        alert('Could not extract job posting from this URL. Please ensure you are using a direct link to a specific job posting, not a search results page.');
      } else if (errorMessage.includes('timeout')) {
        alert('The website took too long to respond. Please try again.');
      } else {
        alert('Failed to auto-fill from URL. The website may be blocking automated access or the URL format is not supported. Please try manually entering the information.');
      }
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    
    try {
      await createJobApplication({
        title: position,
        company: company,
        description: description,
        location: location,
        salaryRange: salaryRange,
        requirements: requirements,
        responsibilities: responsibilities,
        benefits: companyValues,
        interviewType: interviewType,
        url: jobUrl || undefined
      });
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to create job:', error);
      alert('Failed to add interview. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1f2328] mb-2">
            Add New Interview
          </h1>
          <p className="text-[#656d76]">
            Add an upcoming interview or create a practice session
          </p>
        </div>

        {/* Auto-fill Section */}
        <div className="bg-white border border-[#d0d7de] rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="size-5 text-[#9a6700]" />
            <h2 className="text-xl font-semibold text-[#1f2328]">Auto-fill from Job Posting</h2>
          </div>
          <p className="text-[#656d76] mb-4 text-sm">
            Paste a job posting URL to automatically extract details
          </p>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Link2 className="absolute left-3 top-1/2 transform -translate-y-1/2 size-5 text-[#656d76]" />
              <input
                type="url"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="https://company.com/jobs/..."
                className="w-full pl-10 pr-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent"
              />
            </div>
            <button
              onClick={handleAutoFill}
              disabled={!jobUrl.trim() || isAutoFilling}
              className="px-6 py-2 bg-[#9a6700] text-white rounded-md hover:bg-[#b87900] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isAutoFilling ? (
                <>
                  <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Auto-filling...
                </>
              ) : (
                <>
                  <Sparkles className="size-5" />
                  Auto-fill
                </>
              )}
            </button>
          </div>
        </div>

        {/* Manual Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white border border-[#d0d7de] rounded-lg p-6">
            <h2 className="text-xl font-semibold text-[#1f2328] mb-6">Basic Information</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-[#1f2328] mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent"
                  placeholder="e.g., Google"
                />
              </div>

              <div>
                <label htmlFor="position" className="block text-sm font-medium text-[#1f2328] mb-2">
                  Job Position *
                </label>
                <input
                  type="text"
                  id="position"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent"
                  placeholder="e.g., Senior Software Engineer"
                />
              </div>

              <div>
                <label htmlFor="interviewDate" className="block text-sm font-medium text-[#1f2328] mb-2">
                  Interview Date (Optional)
                </label>
                <input
                  type="date"
                  id="interviewDate"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="interviewType" className="block text-sm font-medium text-[#1f2328] mb-2">
                  Interview Type *
                </label>
                <select
                  id="interviewType"
                  value={interviewType}
                  onChange={(e) => setInterviewType(e.target.value as 'technical' | 'behavioral' | 'both')}
                  required
                  className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent"
                >
                  <option value="technical">Technical</option>
                  <option value="behavioral">Behavioral</option>
                  <option value="both">Both</option>
                </select>
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-[#1f2328] mb-2">
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent"
                  placeholder="e.g., Remote, New York, etc."
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="salaryRange" className="block text-sm font-medium text-[#1f2328] mb-2">
                  Salary Range
                </label>
                <input
                  type="text"
                  id="salaryRange"
                  value={salaryRange}
                  onChange={(e) => setSalaryRange(e.target.value)}
                  className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent"
                  placeholder="e.g., $120k - $180k"
                />
              </div>
            </div>
          </div>

          {/* Job Details */}
          <div className="bg-white border border-[#d0d7de] rounded-lg p-6">
            <h2 className="text-xl font-semibold text-[#1f2328] mb-6">Job Details</h2>
            
            <div className="space-y-6">
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-[#1f2328] mb-2">
                  Job Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent resize-none"
                  placeholder="Brief description of the role and what you'll be working on..."
                />
              </div>

              <div>
                <label htmlFor="responsibilities" className="block text-sm font-medium text-[#1f2328] mb-2">
                  Key Responsibilities
                </label>
                <textarea
                  id="responsibilities"
                  value={responsibilities}
                  onChange={(e) => setResponsibilities(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent resize-none"
                  placeholder="One responsibility per line..."
                />
              </div>

              <div>
                <label htmlFor="requirements" className="block text-sm font-medium text-[#1f2328] mb-2">
                  Requirements & Prerequisites
                </label>
                <textarea
                  id="requirements"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent resize-none"
                  placeholder="One requirement per line..."
                />
              </div>

              <div>
                <label htmlFor="companyValues" className="block text-sm font-medium text-[#1f2328] mb-2">
                  Company Values & Culture
                </label>
                <textarea
                  id="companyValues"
                  value={companyValues}
                  onChange={(e) => setCompanyValues(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent resize-none"
                  placeholder="One value per line..."
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-[#1a7f37] text-white rounded-md hover:bg-[#1f883d] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Add Interview'
              )}
            </button>
            <Link
              to="/dashboard"
              className="px-8 py-3 bg-[#f6f8fa] text-[#1f2328] rounded-md hover:bg-[#eaeef2] font-semibold transition-colors border border-[#d0d7de]"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}