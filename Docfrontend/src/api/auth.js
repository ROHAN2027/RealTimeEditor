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
        // "message": "Login successful","user": { ...userData } 
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
        const response = await api.get('/auth/profile');
        return response.data;
        // "message": "Profile retrieved successfully", "user": { ...userData }
    } catch (error) {
        console.error('Error fetching user profile:', error);
        throw error;
    }
};

/**
 * 🌟 4. NEW: Log out the user
 * Tells the backend to destroy the HTTP-Only cookie vault.
 */
export const logoutUser = async () => {
    try {
        const response = await api.post('/auth/logout');
        return response.data;
    } catch (error) {
        console.error('Error logging out:', error);
        throw error;
    }
};
