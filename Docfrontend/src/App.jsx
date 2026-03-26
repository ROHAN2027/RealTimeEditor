// import { BrowserRouter , Routes , Route } from 'react-router-dom';
// import { AuthProvider } from './context/AuthContext';
// import ProtectedRoute from './components/comman/ProtectedRoute';
// import PublicRoute from './components/comman/publicRoute';
// import AxiosInterceptor from './components/comman/AxiosInterceptor';

// import Login from './pages/Login';
// import Dashboard from './pages/Dashboard';
// import Landing from './pages/Landing';

// function App() {

//   return (
//     <>
//     <AuthProvider>
//       <BrowserRouter>
//         <AxiosInterceptor>
//         <Routes>
//           <Route path="/login" element={
//             <PublicRoute>
//               <Login />
//             </PublicRoute>
//           } />
//           <Route path="/dashboard"element={
//                 <ProtectedRoute>
//                   <Dashboard />
//                 </ProtectedRoute>
//               } />
//           <Route path="/" element={<Landing />} />
//         </Routes>
//         </AxiosInterceptor>
//       </BrowserRouter>
//     </AuthProvider>
//     </>
//   );
// }

// export default App


import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext'; // <-- Import the SocketProvider
import ProtectedRoute from './components/comman/ProtectedRoute';
import PublicRoute from './components/comman/publicRoute'; // Note: Ensure casing matches your file exactly!
import AxiosInterceptor from './components/comman/AxiosInterceptor';

// Pages & Components
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import EditorRoom from './components/EditorRoom'; // <-- Import the Editor

function App() {
  return (
    // 1. BrowserRouter must be the absolute top-level wrapper
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider> {/* 2. SocketProvider should wrap around all components that need socket access */}
          <AxiosInterceptor>
            <Routes>
              
              {/* --- PUBLIC ROUTES --- */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            {/* You need a Register route! */}
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
            
            {/* THE EDITOR ROUTE: Notice the dynamic :projectId parameter */}
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
