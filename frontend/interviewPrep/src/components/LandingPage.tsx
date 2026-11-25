import { Link } from 'react-router';
import { Brain, Target, Mic, CheckCircle } from 'lucide-react';

export function LandingPage() {
  const isLoggedIn = Boolean(localStorage.getItem('token'));

  return (
    <div className="min-h-screen bg-[#f6f8fa]">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4 border-b border-[#d0d7de]">
        <div className="flex items-center justify-between">
          <Link to={isLoggedIn ? '/dashboard' : '/'} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Brain className="size-8 text-[#0969da]" />
            <span className="font-semibold text-xl text-[#1f2328]">HireSync</span>
          </Link>
          <div className="flex gap-4">
            {isLoggedIn ? (
              <Link
                to="/dashboard"
                className="px-6 py-2 bg-[#1a7f37] text-white rounded-md hover:bg-[#1f883d] transition-colors"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-[#656d76] hover:text-[#1f2328] transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="px-6 py-2 bg-[#1a7f37] text-white rounded-md hover:bg-[#1f883d] transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-[#1f2328] mb-6">
            Ace Your Next Interview with AI-Powered Practice
          </h1>
          <p className="text-xl text-[#656d76] mb-8">
            Practice with realistic AI interviews, track your progress, and get
            personalized feedback to land your dream job.
          </p>
          <Link
            to={isLoggedIn ? '/dashboard' : '/signup'}
            className="inline-block px-8 py-4 bg-[#1a7f37] text-white rounded-md hover:bg-[#1f883d] text-lg font-semibold transition-colors"
          >
            {isLoggedIn ? 'Open Dashboard' : 'Get Started Free'}
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
          <div className="text-center">
            <div className="inline-flex items-center justify-center size-16 bg-white border border-[#d0d7de] rounded-lg mb-4">
              <Target className="size-8 text-[#0969da]" />
            </div>
            <h3 className="font-semibold text-xl mb-2 text-[#1f2328]">Track Your Interviews</h3>
            <p className="text-[#656d76]">
              Keep all your upcoming interviews organized with our smart
              tracker. Never miss a deadline.
            </p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center size-16 bg-white border border-[#d0d7de] rounded-lg mb-4">
              <CheckCircle className="size-8 text-[#0969da]" />
            </div>
            <h3 className="font-semibold text-xl mb-2 text-[#1f2328]">Curated Prep Materials</h3>
            <p className="text-[#656d76]">
              Get tailored behavioral and technical questions for each job
              listing you're targeting.
            </p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center size-16 bg-white border border-[#d0d7de] rounded-lg mb-4">
              <Mic className="size-8 text-[#0969da]" />
            </div>
            <h3 className="font-semibold text-xl mb-2 text-[#1f2328]">AI Mock Interviews</h3>
            <p className="text-[#656d76]">
              Practice with our AI interviewer that simulates real interview
              scenarios with voice interaction.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}