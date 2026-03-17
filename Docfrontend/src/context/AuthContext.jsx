import { createContext , useState , useEffect , useContext }   from "react";
import api from "../api/axiosSetup";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const restoreSession = async () => {
            const token = localStorage.getItem("jwt_token");
            if (token) {
                try {
                    const response = await api.get("/auth/profile", {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    setUser(response.data.user);
                } catch (error) {
                    console.error("Failed to restore session:", error);
                    localStorage.removeItem("jwt_token");
                    setUser(null);
                }
            }
            setLoading(false);
        };
        restoreSession();
    }, []);

    const login = async (token , userdata ) => {
        localStorage.setItem("jwt_token", token);
        setUser(userdata);
    }

    const logout = () => {
        localStorage.removeItem("jwt_token");
        setUser(null);
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