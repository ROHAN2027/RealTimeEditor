import React from 'react';

export default function Input({ label, type = 'text', name, value, onChange, required, placeholder }) {
    return (
        <div className="flex flex-col gap-1.5 w-full">
            {/* Label with Fallback to Dark Slate (#334155) */}
            {label && (
                <label className="text-sm font-bold text-[var(--theme-text,#334155)] ml-1">
                    {label}
                </label>
            )}
            
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                required={required}
                placeholder={placeholder}
                className="
                    w-full px-4 py-3 
                    
                    /* Background with Fallback to White */
                    bg-[var(--theme-bg,#ffffff)]/80 backdrop-blur-sm 
                    border border-[var(--theme-text,#cbd5e1)]/40 rounded-xl 
                    
                    /* 🌟 THE FIX: Text defaults to very dark Slate (#0f172a) if theme variable is missing */
                    text-[var(--theme-text,#0f172a)] 
                    placeholder-[var(--theme-text,#94a3b8)]/60 
                    
                    /* Focus States */
                    focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent,#3b82f6)]/50 focus:border-[var(--theme-accent,#3b82f6)] 
                    transition-all duration-200 shadow-inner
                    
                    /* Premium Autofill Fixes (Also using Fallbacks) */
                    [&:autofill]:bg-[var(--theme-bg,#ffffff)] 
                    [&:autofill]:text-[var(--theme-text,#0f172a)] 
                    [&:autofill]:shadow-[inset_0_0_0px_1000px_var(--theme-bg,#ffffff)]
                    [&:autofill]:[-webkit-text-fill-color:var(--theme-text,#0f172a)]
                "
            />
        </div>
    );
}