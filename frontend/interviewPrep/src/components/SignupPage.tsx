import { Link, useNavigate } from "react-router";
import { Brain } from "lucide-react";
import { type FormEvent, useState } from "react";
import { signup } from "../../apis/authService";

export function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await signup({ email, name, password });
      navigate("/dashboard");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Signup failed. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f8fa] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <Brain className="size-8 text-[#0969da]" />
          <span className="font-semibold text-xl text-[#1f2328]">
            InterviewPrep
          </span>
        </Link>

        {/* Signup Card */}
        <div className="bg-white border border-[#d0d7de] rounded-lg p-8">
          <h2 className="text-2xl font-bold text-[#1f2328] mb-2">
            Create your account
          </h2>
          <p className="text-[#656d76] mb-6">Start preparing for interviews</p>

          {error && (
            <div className="mb-4 p-3 bg-[#ffebe6] border border-[#d1240a] text-[#d1240a] rounded-md text-sm">
              {error}
            </div>
          )}

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
              disabled={isLoading}
              className="w-full py-2 bg-[#1a7f37] text-white rounded-md hover:bg-[#1f883d] disabled:bg-[#6e7781] disabled:cursor-not-allowed font-medium transition-colors"
            >
              {isLoading ? "Creating account..." : "Sign Up"}
            </button>
          </form>

          <p className="text-center text-[#656d76] mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-[#0969da] hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
