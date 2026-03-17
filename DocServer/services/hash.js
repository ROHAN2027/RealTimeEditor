import  argon2  from "argon2";

export const hashPassword = async (password) => {
        const hash = await argon2.hash(password, {
            type: argon2.argon2id,
            memoryCost: 2 ** 16, // 64 MB
            timeCost: 3, // 3 iterations
            parallelism: 1, // single thread
        });
        return hash;

};

export const verifyPassword = async (password, hash) => {
        return await argon2.verify(hash, password);
};