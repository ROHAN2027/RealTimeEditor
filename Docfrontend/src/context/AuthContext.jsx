import { createContext , useState , useEffect , useContext }   from "react";
import api from "../api/axiosSetup";
import { logoutUser } from "../api/auth";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const restoreSession = async () => {
                try {
                    const response = await api.get("/auth/profile");
                    setUser(response.data.user);
                } catch (error) {
                    console.error("Failed to restore session:", error);
                    setUser(null);
                }
            setLoading(false);
        };
        restoreSession();
    }, []);

    const login = ( userdata ) => {
        setUser(userdata);
    }

    const logout = async() => {
        try {
            await logoutUser(); // Tell the backend to clear the cookie vault
        } catch (error) {
            console.error("Error logging out from server", error);
        } finally {
            setUser(null);
        }
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
}