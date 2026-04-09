import React , {createContext, useContext , useEffect,useState} from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const { user } = useAuth();

useEffect(() => {
        // If there is no user, just clear the state and do nothing else.
        if (!user?._id) {
            setSocket(null);
            return;
        }

        // // 1. Create the socket
        // const backendURL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        // const newSocket = io(backendURL, {
        //     withCredentials: true,
        // });
        const newSocket = io("/", {
            withCredentials: true,
        });

        // 🌟 2. ERROR HANDLING: Catch cookie rejections or server issues
        newSocket.on("connect_error", (err) => {
            console.error("Socket Connection Error:", err.message);
            // If you want, you could trigger your logout() function here 
            // if err.message === "Authentication error: Invalid or expired token"
        });

        // 3. Save it to state
        setSocket(newSocket);

        // 🌟 4. BULLETPROOF CLEANUP
        // This automatically runs the exact millisecond the user logs out or the component unmounts.
        return () => {
            newSocket.disconnect(); // Kills the network connection
            setSocket(null);        // Clears the React state
        };
        
    }, [user?._id]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
}