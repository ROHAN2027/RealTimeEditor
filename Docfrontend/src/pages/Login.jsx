import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser, registerUser, googleLoginUser, verifyOtpUser } from '../api/auth';
import { GoogleLogin } from '@react-oauth/google';

import Button from '../components/comman/Buttons';
import Input from '../components/comman/Input';
import Logo from '../components/comman/Logo';

export default function Login() {
  const [authView, setAuthView] = useState('login'); 
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [otp, setOtp] = useState(new Array(6).fill(''));
  const otpInputRefs = useRef([]);
  
  // 🌟 NEW: OTP Timer State (60 seconds)
  const [timer, setTimer] = useState(0);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  // 🌟 NEW: Countdown Timer Effect
  useEffect(() => {
    let interval;
    if (authView === 'otp' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [authView, timer]);

  // Format timer to MM:SS
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleLoginSubmit = async (e) => {
    e.preventDefault(); setError(''); setIsLoading(true);
    console.log("[FRONTEND] Attempting Login with:", formData.email);
    try {
      const data = await loginUser({ email: formData.email, password: formData.password });
      login(data.user); 
      navigate('/dashboard');
    } catch (err) { 
      const msg = err.response?.data?.message || 'Login failed.';
      setError(msg); 
      if(msg.includes("not verified")) {
          console.log("[FRONTEND] Account unverified. Forcing Resend to trigger OTP screen.");
          // Trigger a resend to get them a fresh code before showing the screen
          handleResendOtp(); 
      }
    }
    finally { setIsLoading(false); }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault(); setError(''); setIsLoading(true);
    console.log("[FRONTEND] Attempting Registration for:", formData.email);
    try {
      await registerUser(formData);
      setAuthView('otp');
      setTimer(60); // Start 60-second cooldown
    } catch (err) { 
      setError(err.response?.data?.message || 'Registration failed.'); 
      console.error("[FRONTEND] Registration Error:", err);
    }
    finally { setIsLoading(false); }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault(); setError(''); setIsLoading(true);
    const otpCode = otp.join('');
    
    console.log(`[FRONTEND] Submitting OTP: ${otpCode} for ${formData.email}`);
    
    if (otpCode.length !== 6) {
        setError('Please enter all 6 digits.');
        setIsLoading(false);
        return;
    }

    try {
        await verifyOtpUser({ email: formData.email, otp: otpCode });
        console.log("[FRONTEND] OTP Verified! Logging user in...");
        const data = await loginUser({ email: formData.email, password: formData.password });
        login(data.user); 
        navigate('/dashboard');
    } catch (err) {
        console.error("[FRONTEND] Verify OTP Error:", err);
        setError(err.response?.data?.message || 'Invalid verification code.');
    } finally {
        setIsLoading(false);
    }
  };

  // 🌟 NEW: Resend OTP Logic
  const handleResendOtp = async () => {
    setError('');
    console.log("[FRONTEND] Requesting new OTP for:", formData.email);
    try {
      // Re-triggering registerUser acts as our "Resend" because of the smart backend logic!
      await registerUser(formData);
      setTimer(60); // Reset timer to 60s
      setOtp(new Array(6).fill('')); // Clear inputs
      setAuthView('otp'); // Ensure we are on the OTP view
      otpInputRefs.current[0].focus(); // Focus first box
      console.log("[FRONTEND] New OTP requested successfully.");
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code.');
      console.error("[FRONTEND] Resend OTP Error:", err);
    }
  };

  const handleOtpChange = (element, index) => {
    if (isNaN(element.value)) return;
    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);
    if (element.value && index < 5) {
        otpInputRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
        otpInputRefs.current[index - 1].focus();
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError(''); setIsLoading(true);
    try {
      const data = await googleLoginUser(credentialResponse.credential);
      login(data.user); navigate('/dashboard');
    } catch (err) { setError(err.response?.data?.message || 'Google login failed.'); }
    finally { setIsLoading(false); }
  };

  const translateClass = authView === 'login' 
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

      <div className={`flex h-full w-[200vw] lg:w-[150vw] transition-transform duration-[1200ms] ease-[cubic-bezier(0.77,0,0.175,1)] transform-gpu will-change-transform ${translateClass}`}>
        
        {/* PANEL 1: LOGIN */}
        <div className="w-[100vw] lg:w-[50vw] h-full flex flex-col justify-center px-8 sm:px-16 lg:px-24 z-20">
          <div className={`w-full max-w-sm mx-auto transition-all duration-1000 delay-300 ${authView === 'login' ? 'opacity-100 blur-0' : 'opacity-0 blur-sm translate-x-10 pointer-events-none'}`}>
            <h1 className="text-4xl font-extrabold text-[var(--theme-text)] tracking-tight mb-2">Welcome back.</h1>
            <p className="text-[var(--theme-text)]/60 font-medium mb-8">Log in to your account to continue.</p>

            {error && authView === 'login' && <div className="mb-6 p-4 bg-red-500/10 border-l-4 border-red-500 text-red-600 rounded-r-lg text-sm font-semibold">{error}</div>}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <Input label="Email Address" type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="you@company.com" />
              <Input label="Password" type="password" name="password" value={formData.password} onChange={handleChange} required placeholder="••••••••" />
              <div className="pt-4"><Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading && authView === 'login'}>Log In</Button></div>
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
              <button type="button" onClick={() => { setAuthView('register'); setError(''); }} className="text-[var(--theme-accent)] hover:brightness-125 font-bold ml-2">Sign up</button>
            </p>
          </div>
        </div>

        {/* PANEL 2: SHOWCASE */}
        <div className="hidden lg:flex w-[50vw] h-full bg-[var(--theme-text)]/5 border-x border-[var(--theme-text)]/10 relative items-center justify-center overflow-hidden z-30">
          <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-[var(--theme-accent)]/20 rounded-full blur-[120px] mix-blend-screen" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[var(--theme-accent)]/10 rounded-full blur-[100px] mix-blend-screen" />

          <div className="relative z-10 w-4/5 max-w-lg aspect-square animate-float-smooth">
            <div className="absolute inset-0 bg-[var(--theme-bg)]/60 glass-panel rounded-[2.5rem] border border-[var(--theme-text)]/10 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.3)] flex flex-col justify-between p-12">
              <div className="flex items-center gap-3 opacity-60">
                <div className="w-3.5 h-3.5 rounded-full bg-red-400"></div>
                <div className="w-3.5 h-3.5 rounded-full bg-yellow-400"></div>
                <div className="w-3.5 h-3.5 rounded-full bg-green-400"></div>
              </div>
              
              <div className="relative h-24">
                <div className={`absolute inset-0 transition-all duration-700 ease-out ${authView === 'login' ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0 pointer-events-none'}`}>
                  <h3 className="text-4xl font-black text-[var(--theme-text)] tracking-tight leading-tight">Pick up where <span className="text-[var(--theme-accent)]">you left off.</span></h3>
                </div>
                <div className={`absolute inset-0 transition-all duration-700 ease-out ${authView !== 'login' ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
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

        {/* PANEL 3: SIGN UP OR OTP VERIFICATION */}
        <div className="w-[100vw] lg:w-[50vw] h-full flex flex-col justify-center px-8 sm:px-16 lg:px-24 z-20 relative">
          
          {/* --- SIGN UP FORM --- */}
          <div className={`absolute w-full max-w-sm left-1/2 -translate-x-1/2 transition-all duration-1000 ${authView === 'register' ? 'opacity-100 blur-0 delay-300' : 'opacity-0 blur-sm -translate-y-10 pointer-events-none'}`}>
            <h1 className="text-4xl font-extrabold text-[var(--theme-text)] tracking-tight mb-2">Join SyncEditor.</h1>
            <p className="text-[var(--theme-text)]/60 font-medium mb-8">Create your account to start collaborating.</p>

            {error && authView === 'register' && <div className="mb-6 p-4 bg-red-500/10 border-l-4 border-red-500 text-red-600 rounded-r-lg text-sm font-semibold">{error}</div>}

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <Input label="Full Name" name="name" value={formData.name} onChange={handleChange} required placeholder="Rohan Bhati" />
              <Input label="Email Address" type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="you@company.com" />
              <Input label="Password" type="password" name="password" value={formData.password} onChange={handleChange} required placeholder="••••••••" />
              <div className="pt-4"><Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading && authView === 'register'}>Sign Up</Button></div>
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
              <button type="button" onClick={() => { setAuthView('login'); setError(''); }} className="text-[var(--theme-accent)] hover:brightness-125 font-bold ml-2">Log in</button>
            </p>
          </div>

          {/* --- OTP VERIFICATION FORM --- */}
          <div className={`absolute w-full max-w-sm left-1/2 -translate-x-1/2 transition-all duration-1000 ${authView === 'otp' ? 'opacity-100 blur-0 delay-300' : 'opacity-0 blur-sm translate-y-10 pointer-events-none'}`}>
            
            <div className="w-16 h-16 rounded-2xl bg-[var(--theme-accent)]/10 text-[var(--theme-accent)] flex items-center justify-center mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>

            <h1 className="text-4xl font-extrabold text-[var(--theme-text)] tracking-tight mb-2">Check your email.</h1>
            <p className="text-[var(--theme-text)]/60 font-medium mb-8 leading-relaxed">
              We sent a 6-digit verification code to <br/>
              <span className="font-bold text-[var(--theme-text)]">{formData.email}</span>
            </p>

            {error && authView === 'otp' && <div className="mb-6 p-4 bg-red-500/10 border-l-4 border-red-500 text-red-600 rounded-r-lg text-sm font-semibold">{error}</div>}

            <form onSubmit={handleOtpSubmit} className="space-y-8">
              <div className="flex justify-between gap-2">
                {otp.map((data, index) => (
                  <input
                    key={index}
                    type="text"
                    maxLength="1"
                    ref={(el) => (otpInputRefs.current[index] = el)}
                    value={data}
                    onChange={(e) => handleOtpChange(e.target, index)}
                    onKeyDown={(e) => handleOtpKeyDown(e, index)}
                    className="w-12 h-14 text-center text-2xl font-black bg-[var(--theme-text)]/5 border border-[var(--theme-text)]/20 rounded-xl text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)] focus:border-[var(--theme-accent)] transition-all placeholder:text-[var(--theme-text)]/20"
                    placeholder="·"
                  />
                ))}
              </div>
              <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading && authView === 'otp'}>
                 Verify Account
              </Button>
            </form>

            <div className="mt-8 flex flex-col items-center gap-3">
              <div className="text-sm font-medium text-[var(--theme-text)]/60">
                {timer > 0 ? (
                  <span>Resend code in <strong className="text-[var(--theme-text)]">{formatTime(timer)}</strong></span>
                ) : (
                  <span>
                    Didn't receive the code? 
                    <button 
                      type="button" 
                      onClick={handleResendOtp} 
                      className="text-[var(--theme-accent)] hover:brightness-125 font-bold ml-2 transition-all"
                    >
                      Resend Code
                    </button>
                  </span>
                )}
              </div>
              
              <button 
                type="button" 
                onClick={() => { setAuthView('register'); setOtp(new Array(6).fill('')); setError(''); }} 
                className="text-xs font-bold uppercase tracking-widest text-[var(--theme-text)]/40 hover:text-[var(--theme-text)]/80 transition-colors"
              >
                Change Email Address
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}