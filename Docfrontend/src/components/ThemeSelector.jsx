import React, { useState, useRef, useEffect } from 'react';
import { useTheme, THEMES } from '../context/ThemeContext';

export default function ThemeSelector() {
    const { currentThemeKey, setCurrentThemeKey } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isOpen && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div ref={dropdownRef} className="fixed bottom-6 right-6 z-[999999] font-sans">
            
            {/* 🌟 THE FLOATING MENU (Glassmorphic & Animated) */}
            {isOpen && (
                <div className="absolute bottom-20 right-0 w-[320px] bg-[var(--theme-bg)]/95 backdrop-blur-2xl rounded-[1.25rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-[var(--theme-text)]/10 p-5 animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-200">
                    
                    {/* Header */}
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-[var(--theme-text)]/10">
                        <h3 className="text-sm font-extrabold text-[var(--theme-text)] uppercase tracking-wide">Workspace Theme</h3>
                        <span className="text-[10px] font-black uppercase tracking-widest bg-[var(--theme-text)]/5 text-[var(--theme-text)]/60 px-2 py-1 rounded-md border border-[var(--theme-text)]/5">
                            {Object.keys(THEMES).length} options
                        </span>
                    </div>
                    
                    {/* Theme Grid */}
                    <div className="grid grid-cols-2 gap-3 max-h-[340px] overflow-y-auto scrollbar-hide pr-1 pb-1">
                        {Object.entries(THEMES).map(([key, theme]) => (
                            <button
                                key={key}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentThemeKey(key);
                                    setIsOpen(false);
                                }}
                                className={`group flex flex-col items-center gap-2.5 p-3.5 rounded-xl border-2 transition-all duration-300 ${
                                    currentThemeKey === key 
                                    ? 'border-[var(--theme-accent)] bg-[var(--theme-accent)]/10 shadow-[0_4px_15px_-3px_var(--theme-accent)]' 
                                    : 'border-transparent bg-[var(--theme-text)]/[0.03] hover:bg-[var(--theme-text)]/10 hover:-translate-y-1 hover:shadow-md'
                                }`}
                            >
                                {/* Theme Color Circle Preview */}
                                <div 
                                    className={`w-10 h-10 rounded-full border-2 shadow-inner transition-colors duration-300 ${
                                        currentThemeKey === key 
                                        ? 'border-[var(--theme-accent)]' 
                                        : 'border-[var(--theme-text)]/20 group-hover:border-[var(--theme-text)]/40'
                                    }`} 
                                    style={{ background: theme.bg }} 
                                />
                                {/* Theme Name */}
                                <span className={`text-xs font-bold transition-colors duration-300 ${
                                    currentThemeKey === key 
                                    ? 'text-[var(--theme-accent)]' 
                                    : 'text-[var(--theme-text)]/70 group-hover:text-[var(--theme-text)]'
                                }`}>
                                    {theme.name}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 🌟 THE TRIGGER BUTTON (FAB) */}
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="w-14 h-14 rounded-full border-2 border-white/20 shadow-[0_10px_25px_rgba(0,0,0,0.3)] flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-[0_15px_35px_rgba(0,0,0,0.4)] active:scale-95 group relative"
                style={{ background: THEMES[currentThemeKey]?.bg || '#1e293b' }}
                title="Change Theme"
            >
                {/* Subtle inner ring that glows on hover */}
                <div className="absolute inset-0 rounded-full border-2 border-white/0 group-hover:border-white/40 transition-colors duration-300"></div>
                
                {/* Paint Roller Icon */}
                <svg className="w-6 h-6 text-white drop-shadow-md group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
            </button>

        </div>
    );
}