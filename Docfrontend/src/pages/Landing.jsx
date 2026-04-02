import React from 'react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/comman/Buttons';
import ThemeLink from '../components/comman/ThemeLink';

export default function Landing() {
  const { user } = useAuth();

  return (
    // 🌟 Notice we removed bg-slate-50. The global CSS handles the background now!
    <div className="min-h-screen flex flex-col font-sans overflow-hidden relative">
      
      {/* --- AMBIENT BACKGROUND GLOWS --- */}
      {/* These create a premium, modern "startup" feel that adapts to your theme */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[var(--theme-accent)]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[var(--theme-accent)]/10 rounded-full blur-[150px] pointer-events-none" />

      {/* 1. TOP NAVBAR */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-[var(--theme-text)]/10 bg-[var(--theme-bg)]/80 backdrop-blur-md">
        <div className="text-2xl font-black text-[var(--theme-accent)] tracking-tighter flex items-center gap-2">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          SyncEditor
        </div>
        
        <div className="flex items-center gap-4">
          {user ? (
            <ThemeLink to="/dashboard" variant="outline">
              Go to Dashboard
            </ThemeLink>
          ) : (
            <>
              <ThemeLink to="/login" variant="nav">Log In</ThemeLink>
              <ThemeLink to="/login">
                <Button variant="primary" size="md">Sign Up Free</Button>
              </ThemeLink>
            </>
          )}
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <main className="relative z-10 flex-grow flex flex-col items-center justify-center text-center px-4 mt-20 md:mt-10">
        <div className="inline-block mb-4 px-4 py-1.5 rounded-full border border-[var(--theme-accent)]/30 bg-[var(--theme-accent)]/10 text-[var(--theme-accent)] text-sm font-bold tracking-wide uppercase">
          Next-Generation Collaboration
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold text-[var(--theme-text)] leading-tight mb-6 max-w-4xl tracking-tight">
          Write Together, <br />
          <span className="text-[var(--theme-accent)] drop-shadow-sm">
            In Real-Time.
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-[var(--theme-text)]/70 mb-10 max-w-2xl font-medium">
          The ultimate collaborative workspace. Create individual notes, or upgrade to group projects and watch your team's ideas sync instantly without conflicts.
        </p>
        
        <div className="flex gap-4">
          {user ? (
            <ThemeLink to="/dashboard">
              <Button variant="primary" size="lg">Open Your Workspace</Button>
            </ThemeLink>
          ) : (
            <ThemeLink to="/login">
              <Button variant="primary" size="lg">Start Writing for Free</Button>
            </ThemeLink>
          )}
          <ThemeLink href="#features">
            <Button variant="secondary" size="lg">Explore Features</Button>
          </ThemeLink>
        </div>

        {/* 3. PREMIUM FEATURES GRID */}
        <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 max-w-6xl w-full text-left px-4 pb-20">
          
          <div className="p-8 rounded-2xl border border-[var(--theme-text)]/10 bg-[var(--theme-text)]/5 backdrop-blur-sm transition-transform duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[var(--theme-accent)]/10 group">
            <div className="w-12 h-12 rounded-xl bg-[var(--theme-accent)]/20 text-[var(--theme-accent)] flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">⚡</div>
            <h3 className="text-xl font-bold text-[var(--theme-text)] mb-3">Instant Sync</h3>
            <p className="text-[var(--theme-text)]/70 leading-relaxed">Powered by WebSockets and CRDTs via Yjs. Every single keystroke, cursor movement, and drawing appears globally with zero lag.</p>
          </div>

          <div className="p-8 rounded-2xl border border-[var(--theme-text)]/10 bg-[var(--theme-text)]/5 backdrop-blur-sm transition-transform duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[var(--theme-accent)]/10 group">
            <div className="w-12 h-12 rounded-xl bg-[var(--theme-accent)]/20 text-[var(--theme-accent)] flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">🎨</div>
            <h3 className="text-xl font-bold text-[var(--theme-text)] mb-3">Infinite Canvas</h3>
            <p className="text-[var(--theme-text)]/70 leading-relaxed">Don't just type. Drop an interactive TLdraw whiteboard directly into your document to sketch out system architectures together.</p>
          </div>

          <div className="p-8 rounded-2xl border border-[var(--theme-text)]/10 bg-[var(--theme-text)]/5 backdrop-blur-sm transition-transform duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[var(--theme-accent)]/10 group">
            <div className="w-12 h-12 rounded-xl bg-[var(--theme-accent)]/20 text-[var(--theme-accent)] flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">⏱️</div>
            <h3 className="text-xl font-bold text-[var(--theme-text)] mb-3">Time Travel</h3>
            <p className="text-[var(--theme-text)]/70 leading-relaxed">Never lose a thought. Automated background saves and a visual version control history let you preview and restore previous states.</p>
          </div>
          
        </div>
      </main>

      {/* 4. MEET THE DEVELOPER SECTION */}
      <section className="relative z-10 border-t border-[var(--theme-text)]/10 bg-[var(--theme-text)]/5 py-16 px-4">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-10">
          
          {/* Profile Photo (Using UI Avatars as a reliable placeholder until you swap it) */}
          <div className="relative">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[var(--theme-accent)] shadow-xl shadow-[var(--theme-accent)]/20">
              <img 
                src="https://ui-avatars.com/api/?name=Rohan+Bhati&background=random&color=fff&size=256" 
                alt="Rohan Bhati" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Bio & Details */}
          <div className="text-center md:text-left flex-1">
            <h2 className="text-sm font-black text-[var(--theme-accent)] uppercase tracking-widest mb-1">Architect & Developer</h2>
            <h3 className="text-3xl font-extrabold text-[var(--theme-text)] mb-2">Rohan Bhati</h3>
            <p className="text-[var(--theme-text)]/70 mb-4 max-w-lg leading-relaxed">
              B.Tech in Artificial Intelligence & Data Engineering at MNIT Jaipur. 
              Passionate about building scalable, real-time distributed systems and tackling complex algorithmic challenges (700+ problems solved on LeetCode).
            </p>
            
            {/* Social Links */}
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-6">
              <ThemeLink href="https://github.com/rohanbhati" isExternal variant="outline">
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" /></svg>
                  GitHub
                </span>
              </ThemeLink>
              <ThemeLink href="https://linkedin.com/in/rohanbhati" isExternal variant="outline">
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  LinkedIn
                </span>
              </ThemeLink>
              <ThemeLink href="https://leetcode.com/rohanbhati" isExternal variant="outline">
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125 2.53 5.752 5.752 0 0 0 3.14 4.025 5.499 5.499 0 0 0 3.734.502l7.02-2.83c.474-.188.756-.71.597-1.189a.98.98 0 0 0-1.246-.62l-6.284 2.508a3.25 3.25 0 0 1-2.128-.276 3.524 3.524 0 0 1-1.854-2.316c-.22-.727-.087-1.503.355-2.106l3.66-3.89 4.792-5.111c.21-.219.296-.54.218-.839a.952.952 0 0 0-.814-.7l-1.077-.107a.972.972 0 0 0-.756.242l-4.47 4.757-3.95 4.22c-.22.22-.572.22-.792 0a.61.61 0 0 1 0-.822l4.02-4.298 5.4-5.752a1.37 1.37 0 0 0 .337-.96 1.404 1.404 0 0 0-.882-1.144l-1.14-.428a1.385 1.385 0 0 0-.964-.017z"/></svg>
                  LeetCode
                </span>
              </ThemeLink>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer className="relative z-10 py-6 text-center text-[var(--theme-text)]/50 text-sm border-t border-[var(--theme-text)]/10 bg-[var(--theme-bg)]">
        <p>&copy; {new Date().getFullYear()} SyncEditor. Built for collaboration.</p>
      </footer>
      
    </div>
  );
}