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
        <div ref={dropdownRef} className="theme-widget-container">
            
            {/* 🌟 BULLETPROOF CSS INJECTION 🌟 */}
            {/* This completely bypasses Tailwind and forces the browser to style the menu */}
            <style>{`
                .theme-widget-container {
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    z-index: 999999; /* Forces it above everything else */
                    font-family: system-ui, -apple-system, sans-serif;
                }
                .theme-popup {
                    position: absolute;
                    bottom: 70px; /* Forces it to sit above the button */
                    right: 0;
                    width: 320px;
                    background: #ffffff;
                    border-radius: 16px;
                    box-shadow: 0 15px 40px rgba(0,0,0,0.3);
                    padding: 16px;
                    border: 1px solid #e2e8f0;
                    animation: popUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes popUp {
                    from { opacity: 0; transform: translateY(10px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .theme-header-box {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid #f1f5f9;
                }
                .theme-title-text { margin: 0; font-size: 15px; font-weight: 800; color: #1e293b; }
                .theme-count { font-size: 11px; background: #eff6ff; color: #2563eb; padding: 4px 10px; border-radius: 12px; font-weight: 700; }
                .theme-grid-box {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                    max-height: 320px;
                    overflow-y: auto;
                    padding-right: 4px;
                }
                .theme-option-btn {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 8px;
                    border-radius: 12px;
                    border: 2px solid transparent;
                    background: #f8fafc;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .theme-option-btn:hover { background: #f1f5f9; transform: translateY(-2px); }
                .theme-option-btn.active { border-color: #3b82f6; background: #eff6ff; }
                .theme-color-circle {
                    width: 38px;
                    height: 38px;
                    border-radius: 50%;
                    border: 2px solid #e2e8f0;
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
                }
                .theme-option-btn.active .theme-color-circle { border-color: #3b82f6; }
                .theme-option-label { font-size: 12px; font-weight: 700; color: #475569; margin: 0; }
                .theme-option-btn.active .theme-option-label { color: #1d4ed8; }
                .theme-fab {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    border: 3px solid rgba(255,255,255,0.5);
                    box-shadow: 0 10px 25px rgba(0,0,0,0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .theme-fab:hover { transform: scale(1.1); box-shadow: 0 15px 35px rgba(0,0,0,0.5); }
            `}</style>

            {/* The Floating Menu */}
            {isOpen && (
                <div className="theme-popup">
                    <div className="theme-header-box">
                        <h3 className="theme-title-text">Workspace Theme</h3>
                        <span className="theme-count">{Object.keys(THEMES).length} options</span>
                    </div>
                    <div className="theme-grid-box">
                        {Object.entries(THEMES).map(([key, theme]) => (
                            <button
                                key={key}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentThemeKey(key);
                                    setIsOpen(false);
                                }}
                                className={`theme-option-btn ${currentThemeKey === key ? 'active' : ''}`}
                            >
                                <div className="theme-color-circle" style={{ background: theme.bg }} />
                                <span className="theme-option-label">{theme.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* The Trigger Button */}
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="theme-fab"
                style={{ background: THEMES[currentThemeKey]?.bg || '#1e293b' }}
                title="Change Theme"
            >
                <svg width="26" height="26" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
            </button>

        </div>
    );
}