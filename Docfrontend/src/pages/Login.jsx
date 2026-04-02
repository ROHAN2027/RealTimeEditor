import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser, registerUser, googleLoginUser } from '../api/auth';
import { GoogleLogin } from '@react-oauth/google';

import Button from '../components/comman/Buttons';
import Input from '../components/comman/Input';
import Logo from '../components/comman/Logo';

export default function Login() {
  const [isLoginView, setIsLoginView] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleLoginSubmit = async (e) => {
    e.preventDefault(); setError(''); setIsLoading(true);
    try {
      const data = await loginUser({ email: formData.email, password: formData.password });
      login(data.user); navigate('/dashboard');
    } catch (err) { setError(err.response?.data?.message || 'Login failed.'); }
    finally { setIsLoading(false); }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault(); setError(''); setIsLoading(true);
    try {
      await registerUser(formData);
      const data = await loginUser({ email: formData.email, password: formData.password });
      login(data.user); navigate('/dashboard');
    } catch (err) { setError(err.response?.data?.message || 'Registration failed.'); }
    finally { setIsLoading(false); }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError(''); setIsLoading(true);
    try {
      const data = await googleLoginUser(credentialResponse.credential);
      login(data.user); navigate('/dashboard');
    } catch (err) { setError(err.response?.data?.message || 'Google login failed.'); }
    finally { setIsLoading(false); }
  };

  // Logic for the Pan
const translateClass = isLoginView 
  ? 'translate-x-0' 
  : '-translate-x-1/2 lg:-translate-x-1/3';

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[var(--theme-bg)] font-sans">
      
      <style>{`
        @keyframes float-smooth { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-15px); } }
        .animate-float-smooth { animation: float-smooth 6s ease-in-out infinite; }
      `}</style>

      {/* FIXED LOGO */}
      <div className="absolute top-8 left-8 z-[100]">
         <Logo />
      </div>

      {/* 🌟 PERFORMANCE BOOST: Added transform-gpu and will-change-transform for Chrome smoothness */}
      <div 
        className={`flex h-full w-[200vw] lg:w-[150vw] transition-transform duration-[1200ms] 
        ease-[cubic-bezier(0.77,0,0.175,1)] transform-gpu will-change-transform ${translateClass}`}
      >
        
        {/* PANEL 1: LOGIN */}
        <div className="w-[100vw] lg:w-[50vw] h-full flex flex-col justify-center px-8 sm:px-16 lg:px-24 z-20">
          <div className={`w-full max-w-sm mx-auto transition-all duration-1000 delay-300 ${isLoginView ? 'opacity-100 blur-0' : 'opacity-0 blur-sm translate-x-10'}`}>
            <h1 className="text-4xl font-extrabold text-[var(--theme-text)] tracking-tight mb-2">Welcome back.</h1>
            <p className="text-[var(--theme-text)]/60 font-medium mb-8">Log in to your account to continue.</p>

            {error && isLoginView && <div className="mb-6 p-4 bg-red-500/10 border-l-4 border-red-500 text-red-600 rounded-r-lg text-sm font-semibold">{error}</div>}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <Input label="Email Address" type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="you@company.com" />
              <Input label="Password" type="password" name="password" value={formData.password} onChange={handleChange} required placeholder="••••••••" />
              <div className="pt-4"><Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading && isLoginView}>Log In</Button></div>
            </form>

            <div className="my-8 flex items-center opacity-70">
              <div className="flex-grow border-t border-[var(--theme-text)]/20"></div>
              <span className="px-4 text-xs uppercase tracking-widest text-[var(--theme-text)]/50 font-bold">Or</span>
              <div className="flex-grow border-t border-[var(--theme-text)]/20"></div>
            </div>
            
            <div className="flex justify-center hover:scale-[1.02] transition-transform shadow-sm rounded-lg mb-8">
              <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError('Google Popup failed.')} theme="outline" size="large" text="continue_with" width="100%" />
            </div>

            <p className="text-center text-sm font-medium text-[var(--theme-text)]/60">
              Don't have an account? 
              <button type="button" onClick={() => { setIsLoginView(false); setError(''); }} className="text-[var(--theme-accent)] hover:brightness-125 font-bold ml-2">Sign up</button>
            </p>
          </div>
        </div>

        {/* PANEL 2: SHOWCASE */}
        <div className="hidden lg:flex w-[50vw] h-full bg-[var(--theme-text)]/5 border-x border-[var(--theme-text)]/10 relative items-center justify-center overflow-hidden z-30">
          <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-[var(--theme-accent)]/20 rounded-full blur-[120px] mix-blend-screen" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[var(--theme-accent)]/10 rounded-full blur-[100px] mix-blend-screen" />

          <div className="relative z-10 w-4/5 max-w-lg aspect-square animate-float-smooth">
            {/* 🌟 GLASS PANEL FIX: Added 'glass-panel' class for Chrome blur support */}
            <div className="absolute inset-0 bg-[var(--theme-bg)]/60 glass-panel rounded-[2.5rem] border border-[var(--theme-text)]/10 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.3)] flex flex-col justify-between p-12">
              <div className="flex items-center gap-3 opacity-60">
                <div className="w-3.5 h-3.5 rounded-full bg-red-400"></div>
                <div className="w-3.5 h-3.5 rounded-full bg-yellow-400"></div>
                <div className="w-3.5 h-3.5 rounded-full bg-green-400"></div>
              </div>
              
              <div className="relative h-24">
                <div className={`absolute inset-0 transition-all duration-700 ease-out ${isLoginView ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0 pointer-events-none'}`}>
                  <h3 className="text-4xl font-black text-[var(--theme-text)] tracking-tight leading-tight">Pick up where <span className="text-[var(--theme-accent)]">you left off.</span></h3>
                </div>
                <div className={`absolute inset-0 transition-all duration-700 ease-out ${!isLoginView ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
                  <h3 className="text-4xl font-black text-[var(--theme-text)] tracking-tight leading-tight">Ideas flowing, <span className="text-[var(--theme-accent)]">instantly.</span></h3>
                </div>
              </div>

              <div className="flex items-center justify-between mt-8">
                <div className="flex -space-x-4">
                  <div className="w-14 h-14 rounded-full border-4 border-[var(--theme-bg)] bg-blue-500 flex items-center justify-center text-white font-bold shadow-xl z-30">R</div>
                  <div className="w-14 h-14 rounded-full border-4 border-[var(--theme-bg)] bg-emerald-500 flex items-center justify-center text-white font-bold shadow-xl z-20">S</div>
                  <div className="w-14 h-14 rounded-full border-4 border-[var(--theme-bg)] bg-purple-500 flex items-center justify-center text-white font-bold shadow-xl z-10">A</div>
                </div>
              </div>
            </div>
            <div className="absolute top-[20%] right-[-15%] bg-blue-600/90 backdrop-blur-md border border-blue-400/50 text-white text-sm font-bold px-4 py-2 rounded-full shadow-2xl transform rotate-6 flex items-center gap-2">
              Rohan typing...
            </div>
          </div>
        </div>

        {/* PANEL 3: SIGN UP */}
        <div className="w-[100vw] lg:w-[50vw] h-full flex flex-col justify-center px-8 sm:px-16 lg:px-24 z-20">
          <div className={`w-full max-w-sm mx-auto transition-all duration-1000 delay-300 ${!isLoginView ? 'opacity-100 blur-0' : 'opacity-0 blur-sm -translate-x-10'}`}>
            <h1 className="text-4xl font-extrabold text-[var(--theme-text)] tracking-tight mb-2">Join SyncEditor.</h1>
            <p className="text-[var(--theme-text)]/60 font-medium mb-8">Create your account to start collaborating.</p>

            {error && !isLoginView && <div className="mb-6 p-4 bg-red-500/10 border-l-4 border-red-500 text-red-600 rounded-r-lg text-sm font-semibold">{error}</div>}

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <Input label="Full Name" name="name" value={formData.name} onChange={handleChange} required placeholder="Rohan Bhati" />
              <Input label="Email Address" type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="you@company.com" />
              <Input label="Password" type="password" name="password" value={formData.password} onChange={handleChange} required placeholder="••••••••" />
              <div className="pt-4"><Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading && !isLoginView}>Sign Up</Button></div>
            </form>

            <div className="my-8 flex items-center opacity-70">
              <div className="flex-grow border-t border-[var(--theme-text)]/20"></div>
              <span className="px-4 text-xs uppercase tracking-widest text-[var(--theme-text)]/50 font-bold">Or</span>
              <div className="flex-grow border-t border-[var(--theme-text)]/20"></div>
            </div>
            
            <div className="flex justify-center hover:scale-[1.02] transition-transform shadow-sm rounded-lg mb-8">
              <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError('Google Popup failed.')} theme="outline" size="large" text="continue_with" width="100%" />
            </div>

            <p className="text-center text-sm font-medium text-[var(--theme-text)]/60">
              Already have an account? 
              <button type="button" onClick={() => { setIsLoginView(true); setError(''); }} className="text-[var(--theme-accent)] hover:brightness-125 font-bold ml-2">Log in</button>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}