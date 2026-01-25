import { Link } from 'react-router';
import { Brain, Edit, User, Mail, Phone, MapPin, Briefcase, GraduationCap, Award, Globe, Linkedin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getProfile, type Profile } from '../../apis/profileService';

export function ProfileView() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await getProfile();
      setProfile(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format text with bullet points
  const formatBulletPoints = (text: string) => {
    return text.split('\n').map((line, index) => {
      const trimmedLine = line.trim();
      // Check if line starts with bullet point character
      if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
        return (
          <div key={index} className="flex gap-2 ml-4 mb-1">
            <span className="text-[#0969da] font-bold">•</span>
            <span className="flex-1">{trimmedLine.substring(1).trim()}</span>
          </div>
        );
      }
      // Regular line
      return trimmedLine ? (
        <p key={index} className="mb-2">{trimmedLine}</p>
      ) : (
        <br key={index} />
      );
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f8fa] flex items-center justify-center">
        <div className="size-8 border-4 border-[#0969da] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#f6f8fa] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#d1242f] mb-4">{error || 'Profile not found'}</p>
          <Link to="/dashboard" className="text-[#0969da] hover:underline">
            Back to Dashboard
          </Link>
        </div>
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
                to="/dashboard"
                className="text-[#656d76] hover:text-[#1f2328] transition-colors font-medium"
              >
                Dashboard
              </Link>
              <Link
                to="/profile/edit"
                className="flex items-center gap-2 px-6 py-2.5 bg-[#1a7f37] text-white rounded-md hover:bg-[#1f883d] font-semibold transition-colors shadow-sm"
              >
                <Edit className="size-4" />
                Edit Profile
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 max-w-5xl">
        {/* Profile Header */}
        <div className="bg-white border border-[#d0d7de] rounded-lg p-8 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="size-20 rounded-full bg-[#0969da] flex items-center justify-center text-white text-3xl font-bold">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#1f2328] mb-2">{profile.name}</h1>
                <div className="flex flex-wrap items-center gap-4 text-[#656d76]">
                  {profile.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="size-4" />
                      <span>{profile.email}</span>
                    </div>
                  )}
                  {profile.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="size-4" />
                      <span>{profile.phone}</span>
                    </div>
                  )}
                  {profile.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="size-4" />
                      <span>{profile.location}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-3">
                  {profile.linkedin && (
                    <a
                      href={profile.linkedin.startsWith('http') ? profile.linkedin : `https://${profile.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[#0969da] hover:underline"
                    >
                      <Linkedin className="size-4" />
                      LinkedIn
                    </a>
                  )}
                  {profile.portfolio && (
                    <a
                      href={profile.portfolio.startsWith('http') ? profile.portfolio : `https://${profile.portfolio}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[#0969da] hover:underline"
                    >
                      <Globe className="size-4" />
                      Portfolio
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Summary */}
        {profile.summary && (
          <div className="bg-white border border-[#d0d7de] rounded-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="size-5 text-[#0969da]" />
              <h2 className="text-xl font-semibold text-[#1f2328]">Professional Summary</h2>
            </div>
            <p className="text-[#1f2328] whitespace-pre-wrap leading-relaxed">{profile.summary}</p>
          </div>
        )}

        {/* Work Experience */}
        {profile.workExperience && (
          <div className="bg-white border border-[#d0d7de] rounded-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="size-5 text-[#0969da]" />
              <h2 className="text-xl font-semibold text-[#1f2328]">Work Experience</h2>
            </div>
            <div className="text-[#1f2328] leading-relaxed">
              {formatBulletPoints(profile.workExperience)}
            </div>
          </div>
        )}

        {/* Education */}
        {profile.education && (
          <div className="bg-white border border-[#d0d7de] rounded-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="size-5 text-[#0969da]" />
              <h2 className="text-xl font-semibold text-[#1f2328]">Education</h2>
            </div>
            <div className="text-[#1f2328] leading-relaxed">
              {formatBulletPoints(profile.education)}
            </div>
          </div>
        )}

        {/* Skills */}
        {profile.skills && (
          <div className="bg-white border border-[#d0d7de] rounded-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="size-5 text-[#0969da]" />
              <h2 className="text-xl font-semibold text-[#1f2328]">Skills</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.skills.split(',').map((skill, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-[#ddf4ff] text-[#0969da] rounded-full text-sm font-medium"
                >
                  {skill.trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Certifications */}
        {profile.certifications && (
          <div className="bg-white border border-[#d0d7de] rounded-lg p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="size-5 text-[#0969da]" />
              <h2 className="text-xl font-semibold text-[#1f2328]">Certifications</h2>
            </div>
            <div className="text-[#1f2328] leading-relaxed">
              {formatBulletPoints(profile.certifications)}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!profile.summary && !profile.workExperience && !profile.education && !profile.skills && !profile.certifications && (
          <div className="bg-white border border-[#d0d7de] rounded-lg p-12 text-center">
            <User className="size-16 text-[#656d76] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[#1f2328] mb-2">Complete Your Profile</h3>
            <p className="text-[#656d76] mb-6">
              Add your professional information to get personalized interview preparation.
            </p>
            <Link
              to="/profile/edit"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a7f37] text-white rounded-md hover:bg-[#1f883d] font-semibold transition-colors"
            >
              <Edit className="size-5" />
              Complete Profile
            </Link>
          </div>
        )}

        {/* Edit Profile CTA - Always visible when profile has content */}
        {(profile.summary || profile.workExperience || profile.education || profile.skills || profile.certifications) && (
          <div className="bg-white border border-[#d0d7de] rounded-lg p-6 text-center">
            <p className="text-[#656d76] mb-4">
              Want to update your information?
            </p>
            <Link
              to="/profile/edit"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a7f37] text-white rounded-md hover:bg-[#1f883d] font-semibold transition-colors"
            >
              <Edit className="size-5" />
              Edit Profile
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
