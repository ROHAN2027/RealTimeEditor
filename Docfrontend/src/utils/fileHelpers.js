// src/utils/fileHelpers.js

export const calculateFileHash = (file) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        
        img.onload = async () => {
            URL.revokeObjectURL(url); 
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            try {
                const hashBuffer = await crypto.subtle.digest('SHA-256', imageData.data.buffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                resolve(hashHex);
            } catch (err) {
                reject(err);
            }
        };
        
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to load image for hashing"));
        };
        
        img.src = url;
    });
};

// 🌟 BONUS: You can move your color generator here too!
export const getColorFromUserId = (userId) => {
    if (!userId) return '#2563eb';
    const palette = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0891b2', '#db2777'];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = (hash << 5) - hash + userId.charCodeAt(i);
        hash |= 0;
    }
    return palette[Math.abs(hash) % palette.length];
};