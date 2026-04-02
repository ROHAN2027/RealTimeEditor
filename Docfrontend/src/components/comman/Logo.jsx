// src/components/comman/Logo.jsx
import React from 'react';
import ThemeLink from './ThemeLink';

export default function Logo({ className = '', hideTextOnMobile = false }) {
    return (
        <ThemeLink to="/" className={`flex items-center gap-2 !no-underline hover:opacity-80 transition-opacity ${className}`}>
            {/* The Lightning Bolt Icon */}
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--theme-accent)] to-blue-500 shadow-lg shadow-[var(--theme-accent)]/20">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 2L3 14h9l-1.5 8L21 10h-8.5L13 2z" />
                </svg>
            </div>
            
            {/* The Brand Name */}
            <span className={`text-2xl font-black tracking-tight text-[var(--theme-text)] ${hideTextOnMobile ? 'hidden sm:block' : ''}`}>
                SyncEditor
            </span>
        </ThemeLink>
    );
}