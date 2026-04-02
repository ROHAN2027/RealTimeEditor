import React from 'react';
import { Link } from 'react-router-dom';

export default function ThemeLink({ 
    to, 
    href, 
    children, 
    variant = 'standard', 
    className = '', 
    isExternal = false,
    icon = null
}) {
    
    // 1. Base styles applied to ALL links
    const baseStyle = "inline-flex items-center transition-all duration-200 focus:outline-none";

    // 2. Premium Themed Variations
    const variants = {
        // Standard: Best for links inside paragraphs. Uses the Accent color and underlines gracefully on hover.
        standard: "text-[var(--theme-accent)] font-medium hover:brightness-125 underline-offset-4 hover:underline decoration-2 decoration-[var(--theme-accent)]/40 hover:decoration-[var(--theme-accent)]",
        
        // Nav: Best for Sidebars and Topbars. Faded text that lights up with the Accent color on hover.
        nav: "text-[var(--theme-text)] opacity-70 hover:opacity-100 hover:text-[var(--theme-accent)] font-semibold hover:translate-x-1",
        
        // Outline: Looks like a secondary button, but acts as a link.
        outline: "px-4 py-2 rounded-lg border-2 border-[var(--theme-accent)]/50 text-[var(--theme-accent)] font-semibold hover:bg-[var(--theme-accent)] hover:text-white hover:border-[var(--theme-accent)] hover:shadow-lg hover:shadow-[var(--theme-accent)]/20"
    };

    // 3. Determine if it's an internal React route or an external website
    const destination = to || href;
    const isOutbound = isExternal || href !== undefined;

    const combinedClasses = `${baseStyle} ${variants[variant]} ${className}`;

    // 4. Render External Link (<a> tag)
    if (isOutbound) {
        return (
            <a 
                href={destination} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={combinedClasses}
            >
                {icon && <span className="mr-2">{icon}</span>}
                {children}
            </a>
        );
    }

    // 5. Render Internal Link (React Router <Link> tag)
    return (
        <Link to={destination} className={combinedClasses}>
            {icon && <span className="mr-2">{icon}</span>}
            {children}
        </Link>
    );
}