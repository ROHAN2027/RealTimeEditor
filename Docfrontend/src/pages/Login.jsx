import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser, registerUser } from '../api/auth';

export default function Login() {
  // 1. Component State
  const [isLoginView, setIsLoginView] = useState(true); // Toggles between Login and Register
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // 2. Hooks
  const navigate = useNavigate();
  const { login } = useAuth(); // Pull the login function from our global Context

  // 3. Handle Input Changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 4. Form Submission Logic
  const handleSubmit = async (e) => {
    e.preventDefault(); // Stop the page from hard refreshing
    setError(''); // Clear any old errors
    setIsLoading(true);

    try {
      let data;
      
      // Check if we are logging in or signing up
      if (isLoginView) {
        // Direct login
        data = await loginUser({ email: formData.email, password: formData.password });
      } else {
        // Register first
        await registerUser(formData);
        
        // After successful registration, automatically login with same credentials
        data = await loginUser({ email: formData.email, password: formData.password });
      }

      // Success! Pass the token and user data to our global AuthContext
      login(data.token, data.user);
      
      // Smoothly redirect to the dashboard
      navigate('/dashboard');

    } catch (err) {
      // If the backend sends an error (e.g., "Invalid password", "Email taken"), display it
      setError(
        err.response?.data?.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 5. The UI (styled with Tailwind)
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-slate-100 p-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold text-blue-600 tracking-tight block mb-2">
            SyncEditor
          </Link>
          <h2 className="text-2xl font-bold text-slate-800">
            {isLoginView ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-slate-500 mt-2">
            {isLoginView ? 'Enter your details to access your workspace.' : 'Sign up to start collaborating.'}
          </p>
        </div>

        {/* Error Message Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm text-center border border-red-200">
            {error}
          </div>
        )}

        {/* The Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Only show "Name" field if they are signing up */}
          {!isLoginView && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required={!isLoginView}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="John Doe"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="••••••••"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 text-white font-medium rounded-lg shadow-md transition ${
              isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading 
              ? 'Please wait...' 
              : (isLoginView ? 'Log In' : 'Sign Up')}
          </button>
        </form>

        {/* Toggle between Login and Register */}
        <div className="mt-6 text-center text-sm text-slate-600">
          {isLoginView ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => {
              setIsLoginView(!isLoginView);
              setError(''); // Clear errors when switching
            }}
            className="text-blue-600 hover:text-blue-800 font-medium transition"
          >
            {isLoginView ? 'Sign up' : 'Log in'}
          </button>
        </div>

      </div>
    </div>
  );
}