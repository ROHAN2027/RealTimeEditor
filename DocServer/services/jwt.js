import jsonwebtoken from 'jsonwebtoken';

export const generateToken = (payload) => {
    return jsonwebtoken.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token) => {
    try{
        const decoded = jsonwebtoken.verify(token, process.env.JWT_SECRET);
        return decoded;
    } catch (err) {
        console.error("Error verifying token in jwt.js:", err);
        const error = new Error("Invalid token or expired token");
        error.statusCode = 401;
        throw error;
    }
}