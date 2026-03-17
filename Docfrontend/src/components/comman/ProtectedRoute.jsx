import {Navigate} from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) {
        return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
    }
    if (!user) {
        return <Navigate to="/login" replace />;
        // means if user is not authenticated, redirect to login page and replace the current entry in the history stack to prevent going back to protected route after login
    }
    return children;
}