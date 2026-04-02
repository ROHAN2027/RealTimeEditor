import React from 'react';

export default function Avatar({ name = 'User', className = '' }) {
    const initial = name.charAt(0).toUpperCase();
    return (
        <div className={`flex items-center justify-center rounded-full bg-gradient-to-br from-[var(--theme-accent)] to-blue-600 text-white font-black shadow-md shadow-[var(--theme-accent)]/20 shrink-0 ${className}`}>
            {initial}
        </div>
    );
}