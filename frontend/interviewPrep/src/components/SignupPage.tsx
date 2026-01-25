import { Link, useNavigate } from 'react-router';
import { Brain } from 'lucide-react';
import { FormEvent, useState } from 'react';

export function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:8000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data));
        navigate('/dashboard');
      } else {
        const error = await response.json();
        alert(error.error || 'Signup failed');
      }
    } catch (err) {
      console.error('Signup error:', err);
      alert('Could not connect to server');
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f8fa] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <Brain className="size-8 text-[#0969da]" />
          <span className="font-semibold text-xl text-[#1f2328]">InterviewPrep</span>
        </Link>

        {/* Signup Card */}
        <div className="bg-white border border-[#d0d7de] rounded-lg p-8">
          <h2 className="text-2xl font-bold text-[#1f2328] mb-2">
            Create your account
          </h2>
          <p className="text-[#656d76] mb-6">Start preparing for interviews</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-[#1f2328] mb-1"
              >
                Full Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[#1f2328] mb-1"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[#1f2328] mb-1"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-[#f6f8fa] border border-[#d0d7de] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-[#1a7f37] text-white rounded-md hover:bg-[#1f883d] font-medium transition-colors"
            >
              Sign Up
            </button>
          </form>

          <p className="text-center text-[#656d76] mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-[#0969da] hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
