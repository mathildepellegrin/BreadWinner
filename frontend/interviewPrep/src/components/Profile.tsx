import { Link } from 'react-router';
import { Brain, ArrowLeft, User, Mail, Phone, MapPin, Briefcase, GraduationCap, Upload, FileText, CheckCircle } from 'lucide-react';
import { FormEvent, useState } from 'react';

export function Profile() {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
  
  // Personal Information
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [linkedIn, setLinkedIn] = useState('');
  const [portfolio, setPortfolio] = useState('');
  
  // Professional Summary
  const [summary, setSummary] = useState('');
  
  // Work Experience
  const [workExperience, setWorkExperience] = useState('');
  
  // Education
  const [education, setEducation] = useState('');
  
  // Skills
  const [skills, setSkills] = useState('');
  
  // Certifications
  const [certifications, setCertifications] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus('uploading');
    
    // Simulate CV parsing - in production, this would call an AI service
    setTimeout(() => {
      // Mock auto-filled data from CV
      setFullName('John Doe');
      setEmail('john.doe@example.com');
      setPhone('+1 (555) 123-4567');
      setLocation('San Francisco, CA');
      setLinkedIn('linkedin.com/in/johndoe');
      setPortfolio('johndoe.dev');
      
      setSummary('Experienced software engineer with 5+ years building scalable web applications. Expertise in React, Node.js, and cloud infrastructure. Passionate about creating user-centric solutions and mentoring junior developers.');
      
      setWorkExperience(`Senior Software Engineer • TechCorp Inc. • 2021 - Present
• Led development of microservices architecture serving 10M+ users
• Improved application performance by 40% through optimization
• Mentored team of 5 junior developers

Software Engineer • StartupXYZ • 2019 - 2021
• Built real-time collaboration features using WebSockets
• Implemented CI/CD pipelines reducing deployment time by 60%
• Contributed to open-source projects`);

      setEducation(`Bachelor of Science in Computer Science
University of California, Berkeley • 2015 - 2019
GPA: 3.8/4.0`);

      setSkills('JavaScript, TypeScript, React, Node.js, Python, AWS, Docker, Kubernetes, PostgreSQL, MongoDB, Git, CI/CD, Agile, System Design');

      setCertifications(`AWS Certified Solutions Architect • 2022
Certified Kubernetes Administrator • 2021`);

      setUploadStatus('success');
      
      // Reset success status after 3 seconds
      setTimeout(() => setUploadStatus('idle'), 3000);
    }, 2000);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Mock save - in production, this would save to database
    alert('Profile saved successfully!');
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
            Your Profile
          </h1>
          <p className="text-[#656d76]">
            Manage your CV information for personalized interview preparation
          </p>
        </div>

        {/* CV Upload Section */}
        <div className="bg-white border border-[#d0d7de] rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="size-5 text-[#0969da]" />
            <h2 className="text-xl font-semibold text-[#1f2328]">Upload CV</h2>
          </div>
          <p className="text-[#656d76] mb-4 text-sm">
            Upload your CV (PDF, DOC, or DOCX) to automatically fill your profile information
          </p>
          
          <div className="relative">
            <input
              type="file"
              id="cv-upload"
              accept=".pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label
              htmlFor="cv-upload"
              className={`flex items-center justify-center gap-2 px-6 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                uploadStatus === 'success'
                  ? 'border-[#1a7f37] bg-[#dafbe1]'
                  : 'border-[#d0d7de] hover:border-[#0969da] hover:bg-[#ddf4ff]'
              }`}
            >
              {uploadStatus === 'uploading' ? (
                <>
                  <div className="size-5 border-2 border-[#0969da] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[#0969da] font-medium">Processing CV...</span>
                </>
              ) : uploadStatus === 'success' ? (
                <>
                  <CheckCircle className="size-5 text-[#1a7f37]" />
                  <span className="text-[#1a7f37] font-medium">CV uploaded successfully!</span>
                </>
              ) : (
                <>
                  <FileText className="size-5 text-[#656d76]" />
                  <span className="text-[#656d76] font-medium">Choose file or drag and drop</span>
                </>
              )}
            </label>
          </div>
        </div>

        {/* Manual Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="bg-white border border-[#d0d7de] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-6">
              <User className="size-5 text-[#0969da]" />
              <h2 className="text-xl font-semibold text-[#1f2328]">Personal Information</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-[#1f2328] mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#1f2328] mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-[#1f2328] mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent"
                  placeholder="+1 (555) 123-4567"
                />
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
                  placeholder="San Francisco, CA"
                />
              </div>

              <div>
                <label htmlFor="linkedIn" className="block text-sm font-medium text-[#1f2328] mb-2">
                  LinkedIn Profile
                </label>
                <input
                  type="url"
                  id="linkedIn"
                  value={linkedIn}
                  onChange={(e) => setLinkedIn(e.target.value)}
                  className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent"
                  placeholder="linkedin.com/in/yourprofile"
                />
              </div>

              <div>
                <label htmlFor="portfolio" className="block text-sm font-medium text-[#1f2328] mb-2">
                  Portfolio/Website
                </label>
                <input
                  type="url"
                  id="portfolio"
                  value={portfolio}
                  onChange={(e) => setPortfolio(e.target.value)}
                  className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent"
                  placeholder="yourwebsite.com"
                />
              </div>
            </div>
          </div>

          {/* Professional Summary */}
          <div className="bg-white border border-[#d0d7de] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-6">
              <FileText className="size-5 text-[#0969da]" />
              <h2 className="text-xl font-semibold text-[#1f2328]">Professional Summary</h2>
            </div>
            
            <div>
              <label htmlFor="summary" className="block text-sm font-medium text-[#1f2328] mb-2">
                About You
              </label>
              <textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent resize-none"
                placeholder="Write a brief professional summary highlighting your experience and expertise..."
              />
            </div>
          </div>

          {/* Work Experience */}
          <div className="bg-white border border-[#d0d7de] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-6">
              <Briefcase className="size-5 text-[#0969da]" />
              <h2 className="text-xl font-semibold text-[#1f2328]">Work Experience</h2>
            </div>
            
            <div>
              <label htmlFor="workExperience" className="block text-sm font-medium text-[#1f2328] mb-2">
                Experience Details
              </label>
              <textarea
                id="workExperience"
                value={workExperience}
                onChange={(e) => setWorkExperience(e.target.value)}
                rows={8}
                className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent resize-none font-mono text-sm"
                placeholder="Job Title • Company Name • Start Date - End Date
• Key achievement or responsibility
• Key achievement or responsibility

Job Title • Company Name • Start Date - End Date
• Key achievement or responsibility"
              />
            </div>
          </div>

          {/* Education */}
          <div className="bg-white border border-[#d0d7de] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-6">
              <GraduationCap className="size-5 text-[#0969da]" />
              <h2 className="text-xl font-semibold text-[#1f2328]">Education</h2>
            </div>
            
            <div>
              <label htmlFor="education" className="block text-sm font-medium text-[#1f2328] mb-2">
                Education Details
              </label>
              <textarea
                id="education"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                rows={5}
                className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent resize-none"
                placeholder="Degree in Major
University Name • Graduation Year
GPA: X.X/4.0"
              />
            </div>
          </div>

          {/* Skills */}
          <div className="bg-white border border-[#d0d7de] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-6">
              <CheckCircle className="size-5 text-[#0969da]" />
              <h2 className="text-xl font-semibold text-[#1f2328]">Skills</h2>
            </div>
            
            <div>
              <label htmlFor="skills" className="block text-sm font-medium text-[#1f2328] mb-2">
                Technical & Professional Skills
              </label>
              <textarea
                id="skills"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent resize-none"
                placeholder="JavaScript, React, Node.js, Python, AWS, Docker, etc."
              />
            </div>
          </div>

          {/* Certifications */}
          <div className="bg-white border border-[#d0d7de] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-6">
              <FileText className="size-5 text-[#0969da]" />
              <h2 className="text-xl font-semibold text-[#1f2328]">Certifications</h2>
            </div>
            
            <div>
              <label htmlFor="certifications" className="block text-sm font-medium text-[#1f2328] mb-2">
                Professional Certifications
              </label>
              <textarea
                id="certifications"
                value={certifications}
                onChange={(e) => setCertifications(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent resize-none"
                placeholder="Certification Name • Year
Certification Name • Year"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              className="flex-1 py-3 bg-[#1a7f37] text-white rounded-md hover:bg-[#1f883d] font-semibold transition-colors"
            >
              Save Profile
            </button>
            <Link
              to="/dashboard"
              className="px-8 py-3 bg-[#f6f8fa] text-[#1f2328] rounded-md hover:bg-[#eaeef2] font-semibold transition-colors border border-[#d0d7de] flex items-center justify-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
