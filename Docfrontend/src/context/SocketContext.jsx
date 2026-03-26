import React , {createContext, useContext , useEffect,useState} from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const { user } = useAuth();

    useEffect(() => {
        const token = localStorage.getItem('jwt_token');
        let newSocket;
        if(user && token){
            const backendURL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
            newSocket = io(backendURL,{auth : {token}});
            setSocket(newSocket);
        }else if(socket){
            
            setSocket(null);
        }
        // | Condition    | Action             |
        // | ------------ | ------------------ |
        // | user exists  | create socket      |
        // | user removed | destroy socket     |
        // | user changes | cleanup old socket |
        // 🌟 Bulletproof Cleanup
        return () => {
            if (newSocket) {
                newSocket.disconnect();
            }
        };
        // 🌟 Depend on the ID string, not the whole object, to prevent unwanted re-renders!
    }, [user?._id]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
}