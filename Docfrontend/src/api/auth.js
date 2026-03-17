import api from "./axiosSetup";

/**
 * 1. Register a new user
 * @param {Object} userData - Contains { name, email, password }
 */
export const registerUser = async (userData) => {
    try {
        const response = await api.post('/auth/register', userData);
        return response.data;
        // "message": "User created successfully"
    } catch (error) {
        console.error('Error registering user:', error);
        throw error;
    }
};

/**
 * 2. Log in an existing user
 * @param {Object} credentials - Contains { email, password }
 */

export const loginUser = async (credentials) => {
    try {
        const response = await api.post('/auth/login', credentials);
        return response.data;
        // "message": "Login successful", "token": "<JWT_TOKEN>" and "user": { ...userData } 
    } catch (error) {
        console.error('Error logging in user:', error);
        throw error;
    }
};

/**
 * 3. Fetch the logged-in user's profile
 * Used by the AuthContext when the app first loads to restore the session.
 */

export const fetchUserProfile = async () => {
    try {
        const token = localStorage.getItem('jwt_token');
        if (!token) {
            throw new Error('No token found');
        }
        const response = await api.get('/auth/profile', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data;
        // "message": "Profile retrieved successfully", "user": { ...userData }
    } catch (error) {
        console.error('Error fetching user profile:', error);
        throw error;
    }
};
