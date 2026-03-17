import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function PublicRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) {
        return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
    }
    if (user) {
        return <Navigate to="/dashboard" replace />;
        // means if user is authenticated, redirect to dashboard and replace the current entry in the history stack to prevent going back to login page after logout
    }
    return children;
}