import React from 'react';

export default function Button({ 
    children, 
    onClick, 
    variant = 'primary', 
    size = 'md', 
    className = '', 
    disabled = false, 
    isLoading = false,
    type = 'button',
    icon = null
}) {
    
    // 1. Base styles applied to ALL buttons
    // - active:scale-95 gives that satisfying "push down" feeling when clicked
    // - transition-all makes color and shadow changes smooth
    const baseStyle = "relative inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 overflow-hidden active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:scale-100";

    // 2. Size Variations
    const sizes = {
        sm: "px-3 py-1.5 text-xs shadow-sm",
        md: "px-5 py-2.5 text-sm shadow-md",
        lg: "px-6 py-3 text-base shadow-lg"
    };

    // 3. Premium Themed Variations
    const variants = {
        // Primary: Uses the vibrant accent color from your ThemeContext
        primary: "bg-[var(--theme-accent)] text-white hover:brightness-110 hover:shadow-[var(--theme-accent)]/30 hover:shadow-xl focus:ring-[var(--theme-accent)] border border-white/10",
        
        // Secondary: A beautiful frosted glass/translucent look that adapts to the background
        secondary: "bg-[var(--theme-text)]/5 text-[var(--theme-text)] border border-[var(--theme-text)]/10 hover:bg-[var(--theme-text)]/10 backdrop-blur-md focus:ring-[var(--theme-text)]/30",
        
        // Ghost: Invisible background until hovered (Great for sidebars or top navs)
        ghost: "text-[var(--theme-text)] hover:bg-[var(--theme-text)]/10 shadow-none focus:ring-[var(--theme-text)]/30",
        
        // Danger: Standard red for destructive actions (Delete, Kick user, etc.)
        danger: "bg-red-500 text-white hover:bg-red-600 hover:shadow-red-500/30 hover:shadow-lg focus:ring-red-500 border border-white/10"
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || isLoading}
            className={`${baseStyle} ${sizes[size]} ${variants[variant]} ${className}`}
        >
            {/* Loading Spinner */}
            {isLoading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
            
            {/* Optional SVG Icon */}
            {!isLoading && icon && (
                <span className="mr-2">{icon}</span>
            )}
            
            {/* Button Text */}
            <span className={isLoading ? 'opacity-90' : ''}>
                {children}
            </span>
        </button>
    );
}