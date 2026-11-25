import { Link, useNavigate } from 'react-router';
import { Brain, ArrowLeft, User, Mail, Phone, MapPin, Briefcase, GraduationCap, Upload, FileText, CheckCircle, Loader2, Lock, Unlock } from 'lucide-react';
import { FormEvent, useState, useEffect } from 'react';

export function Profile() {
  const navigate = useNavigate();
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
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

  // Fetch profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setFullName(data.name || '');
          setEmail(data.email || '');
          setPhone(data.phone || '');
          setLocation(data.location || '');
          setLinkedIn(data.linkedin || '');
          setPortfolio(data.portfolio || '');
          setSummary(data.summary || '');
          setWorkExperience(data.experience || '');
          setEducation(data.education || '');
          setSkills(data.skills || '');
          setCertifications(data.certifications || '');
        } else if (res.status === 401) {
          navigate('/login');
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus('uploading');
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/profile/upload-cv`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || 'Failed to upload CV');
      }

      const data = await res.json();
      
      // Populate form with AI-parsed data
      if (data.name) setFullName(data.name);
      if (data.email) setEmail(data.email);
      if (data.phone) setPhone(data.phone);
      if (data.location) setLocation(data.location);
      if (data.linkedin) setLinkedIn(data.linkedin);
      if (data.portfolio) setPortfolio(data.portfolio);
      if (data.summary) setSummary(data.summary);
      
      // Helper to format arrays into text blocks
      const formatList = (val: any) => {
        if (!val) return '';
        if (Array.isArray(val)) {
          return val.map(i => typeof i === 'object' ? Object.values(i).join(' • ') : i).join('\n\n');
        }
        return val;
      };

      if (data.experience) setWorkExperience(formatList(data.experience));
      if (data.education) setEducation(formatList(data.education));
      if (data.skills) setSkills(formatList(data.skills));
      if (data.certifications) setCertifications(formatList(data.certifications));

      setUploadStatus('success');
      setTimeout(() => setUploadStatus('idle'), 3000);
      
      // Enable editing so user can review/fix the imported data
      setIsEditing(true);
      alert("CV parsed successfully! Please review the details below and click 'Save Profile'.");

    } catch (error) {
      console.error("CV Upload Error:", error);
      setUploadStatus('idle');
      alert(`Error: ${error instanceof Error ? error.message : "Failed to parse CV"}`);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: fullName,
          email,
          phone,
          location,
          linkedin: linkedIn,
          portfolio,
          summary,
          experience: workExperience,
          education,
          skills,
          certifications
        })
      });

      if (res.ok) {
        alert('Profile saved successfully!');
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.detail || 'Failed to save profile');
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      alert(error instanceof Error ? error.message : 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
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
              <span className="font-semibold text-xl text-[#1f2328]">HireSync</span>
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
            Upload your CV (PDF, DOCX, or TXT) to automatically fill your profile information
          </p>
          
          <div className="relative">
            <input
              type="file"
              id="cv-upload"
              accept=".pdf,.docx,.txt"
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
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <User className="size-5 text-[#0969da]" />
                <h2 className="text-xl font-semibold text-[#1f2328]">Personal Information</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all shadow-sm ${
                  isEditing 
                    ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50' 
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {isEditing ? (
                  <>
                    <Unlock className="size-4" />
                    <span>Editing Enabled</span>
                  </>
                ) : (
                  <>
                    <Lock className="size-4" />
                    <span>Enable Editing</span>
                  </>
                )}
              </button>
            </div>
            
            <div className={`grid md:grid-cols-2 gap-6 transition-opacity duration-200 ${!isEditing ? 'opacity-60' : ''}`}>
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
                  className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent disabled:opacity-70 disabled:cursor-not-allowed"
                  placeholder="John Doe"
                  disabled={!isEditing}
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
                  className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent disabled:opacity-70 disabled:cursor-not-allowed"
                  placeholder="john@example.com"
                  disabled={!isEditing}
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
                  className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent disabled:opacity-70 disabled:cursor-not-allowed"
                  placeholder="+1 (555) 123-4567"
                  disabled={!isEditing}
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
                  className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent disabled:opacity-70 disabled:cursor-not-allowed"
                  placeholder="San Francisco, CA"
                  disabled={!isEditing}
                />
              </div>

              <div>
                <label htmlFor="linkedIn" className="block text-sm font-medium text-[#1f2328] mb-2">
                  LinkedIn Profile
                </label>
                <input
                  type="text"
                  id="linkedIn"
                  value={linkedIn}
                  onChange={(e) => setLinkedIn(e.target.value)}
                  className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent disabled:opacity-70 disabled:cursor-not-allowed"
                  placeholder="linkedin.com/in/yourprofile"
                  disabled={!isEditing}
                />
              </div>

              <div>
                <label htmlFor="portfolio" className="block text-sm font-medium text-[#1f2328] mb-2">
                  Portfolio/Website
                </label>
                <input
                  type="text"
                  id="portfolio"
                  value={portfolio}
                  onChange={(e) => setPortfolio(e.target.value)}
                  className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent disabled:opacity-70 disabled:cursor-not-allowed"
                  placeholder="yourwebsite.com"
                  disabled={!isEditing}
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
                className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent resize-none disabled:opacity-70 disabled:cursor-not-allowed"
                placeholder="Write a brief professional summary highlighting your experience and expertise..."
                disabled={!isEditing}
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
                className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent resize-none font-mono text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                placeholder="Job Title • Company Name • Start Date - End Date
• Key achievement or responsibility
• Key achievement or responsibility

Job Title • Company Name • Start Date - End Date
• Key achievement or responsibility"
                disabled={!isEditing}
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
                className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent resize-none disabled:opacity-70 disabled:cursor-not-allowed"
                placeholder="Degree in Major
University Name • Graduation Year
GPA: X.X/4.0"
                disabled={!isEditing}
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
                className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent resize-none disabled:opacity-70 disabled:cursor-not-allowed"
                placeholder="JavaScript, React, Node.js, Python, AWS, Docker, etc."
                disabled={!isEditing}
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
                className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent resize-none disabled:opacity-70 disabled:cursor-not-allowed"
                placeholder="Certification Name • Year
Certification Name • Year"
                disabled={!isEditing}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={!isEditing || isSaving}
              className="flex-1 py-3 bg-[#1a7f37] text-white rounded-md hover:bg-[#1f883d] font-semibold transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Profile'}
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
