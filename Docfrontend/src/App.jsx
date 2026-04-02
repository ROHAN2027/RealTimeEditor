import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/comman/ProtectedRoute';
import PublicRoute from './components/comman/publicRoute';
import AxiosInterceptor from './components/comman/AxiosInterceptor';

import ThemeSelector from './components/ThemeSelector'; // 🌟 Imported here

// Pages & Components
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import EditorRoom from './components/EditorRoom';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AxiosInterceptor>
            
            {/* 🌟 THE FLOATING THEME BUTTON 🌟 */}
            {/* Placed outside of <Routes> so it appears on every single page */}
            <div className="fixed bottom-6 right-6 z-50">
               <ThemeSelector />
            </div>

            <Routes>
              
              {/* --- PUBLIC ROUTES --- */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } />
              
              <Route path="/register" element={
                <PublicRoute>
                  <div>Register Component Goes Here</div>
                </PublicRoute>
              } />

              {/* --- PROTECTED ROUTES --- */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/project/:projectId" element={
                <ProtectedRoute>
                  <EditorRoom />
                </ProtectedRoute>
              } />

              {/* --- CATCH-ALL 404 ROUTE --- */}
              <Route path="*" element={
                <div style={{ textAlign: 'center', marginTop: '50px' }}>
                  <h2>404 - Page Not Found</h2>
                </div>
              } />

            </Routes>
          </AxiosInterceptor>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;