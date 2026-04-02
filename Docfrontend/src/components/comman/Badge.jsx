import React from 'react';

export default function Badge({ children, variant = 'neutral', className = '' }) {
    const variants = {
        primary: "bg-[var(--theme-accent)]/10 text-[var(--theme-accent)] border-[var(--theme-accent)]/20",
        purple: "bg-purple-500/10 text-purple-500 border-purple-500/20",
        emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        neutral: "bg-[var(--theme-text)]/5 text-[var(--theme-text)]/70 border-[var(--theme-text)]/10"
    };

    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border backdrop-blur-sm ${variants[variant]} ${className}`}>
            {children}
        </span>
    );
}