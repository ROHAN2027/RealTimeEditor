import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Landing() {
  // Pull in the user state from our global context
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      
      {/* 1. TOP NAVBAR */}
      <nav className="flex items-center justify-between px-8 py-4 bg-white shadow-sm">
        <div className="text-2xl font-bold text-blue-600 tracking-tight">
          SyncEditor
        </div>
        
        <div className="space-x-4">
          {user ? (
            // If logged in, show Dashboard button
            <Link 
              to="/dashboard" 
              className="px-5 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 font-medium transition"
            >
              Go to Dashboard
            </Link>
          ) : (
            // If NOT logged in, show Login and Sign Up
            <>
              <Link to="/login" className="px-5 py-2 text-slate-600 hover:text-blue-600 font-medium transition">
                Log In
              </Link>
              <Link 
                to="/login" 
                className="px-5 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 font-medium transition"
              >
                Sign Up Free
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* 2. HERO SECTION (The main attraction) */}
      <main className="flex-grow flex flex-col items-center justify-center text-center px-4 mt-16 md:mt-0">
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 leading-tight mb-6 max-w-4xl">
          Write Together, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
            In Real-Time.
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl">
          The ultimate collaborative workspace. Create individual notes, or upgrade to group projects and watch your team's ideas sync instantly without conflicts.
        </p>
        
        {user ? (
          <Link 
            to="/dashboard" 
            className="px-8 py-4 text-lg text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-lg hover:shadow-xl transition transform hover:-translate-y-1"
          >
            Open Your Workspace
          </Link>
        ) : (
          <Link 
            to="/login" 
            className="px-8 py-4 text-lg text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-lg hover:shadow-xl transition transform hover:-translate-y-1"
          >
            Start Writing for Free
          </Link>
        )}

        {/* 3. QUICK FEATURES (Optional visual flair) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-5xl w-full text-left">
          <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold text-slate-800 mb-2">⚡ Instant Sync</h3>
            <p className="text-slate-600">Powered by WebSockets and CRDTs, every keystroke appears globally with zero lag.</p>
          </div>
          <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold text-slate-800 mb-2">🔒 Private & Group</h3>
            <p className="text-slate-600">Keep your thoughts private, or invite collaborators to edit alongside you in dedicated rooms.</p>
          </div>
          <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold text-slate-800 mb-2">📝 Rich Text Editor</h3>
            <p className="text-slate-600">Format your documents beautifully with our seamless Quill.js integration.</p>
          </div>
        </div>
      </main>

      {/* 4. FOOTER */}
      <footer className="py-8 text-center text-slate-500 text-sm mt-12 bg-white border-t border-slate-200">
        <p>&copy; {new Date().getFullYear()} SyncEditor. Built for collaboration.</p>
      </footer>
      
    </div>
  );
}