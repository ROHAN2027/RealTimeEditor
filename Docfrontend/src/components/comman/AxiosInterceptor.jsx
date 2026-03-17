import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axiosSetup";

export default function AxiosInterceptor({ children }) {
    const navigate = useNavigate();
    useEffect(() => {
        const interceptor = api.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response && error.response.status === 401) {
                    console.warn("Unauthorized access detected. Redirecting to login page.");
                    localStorage.removeItem("jwt_token");
                    navigate("/login");
                }
                return Promise.reject(error);
                }
        );
        return () => {
            api.interceptors.response.eject(interceptor);
        };
    }, [navigate]);
    return children;
}