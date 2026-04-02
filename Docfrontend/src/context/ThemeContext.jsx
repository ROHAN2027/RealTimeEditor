import {createContext , useContext , useState , useEffect, use} from 'react';

const ThemeContext = createContext();

// 🌟 Curated Premium Themes
export const THEMES = {
    // Solid Modern Themes
    light: { name: 'Clean Light', bg: '#f8fafc', text: '#0f172a', accent: '#3b82f6', editorBg: '#ffffff' },
    dark: { name: 'Classic Dark', bg: '#0f172a', text: '#f8fafc', accent: '#60a5fa', editorBg: '#1e293b' },
    dracula: { name: 'Dracula', bg: '#282a36', text: '#f8f8f2', accent: '#ff79c6', editorBg: '#44475a' },
    hacker: { name: 'Cyber Matrix', bg: '#0d1117', text: '#3fb950', accent: '#2ea043', editorBg: '#010409' },
    
    // Premium Gradients
    ocean: { name: 'Deep Ocean', bg: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)', text: '#e0f2fe', accent: '#38bdf8', editorBg: 'rgba(15, 32, 39, 0.75)' },
    sunset: { name: 'Sunset Glow', bg: 'linear-gradient(135deg, #2b1055, #7597de)', text: '#ffffff', accent: '#f472b6', editorBg: 'rgba(43, 16, 85, 0.75)' },
    obsidian: { name: 'Obsidian', bg: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)', text: '#e2e8f0', accent: '#a78bfa', editorBg: 'rgba(15, 12, 41, 0.75)' },
    aurora: { name: 'Aurora Borealis', bg: 'linear-gradient(135deg, #08111e, #162436, #1e928c)', text: '#ccfbf1', accent: '#2dd4bf', editorBg: 'rgba(8, 17, 30, 0.75)' },
    forest: { name: 'Mystic Forest', bg: 'linear-gradient(135deg, #134e5e, #71b280)', text: '#ffffff', accent: '#6ee7b7', editorBg: 'rgba(19, 78, 94, 0.75)' },
    lava: { name: 'Volcanic Lava', bg: 'linear-gradient(135deg, #4b1248, #f0c27b)', text: '#fffbeb', accent: '#fbbf24', editorBg: 'rgba(75, 18, 72, 0.75)' }
};

export const ThemeProvider = ({ children }) => {
    const [currentThemeKey, setCurrentThemeKey] = useState(()=>{
        return localStorage.getItem('app-theme') || 'light';
    });
    useEffect(() => {
        const theme = THEMES[currentThemeKey];
        if(!theme) {
            setCurrentThemeKey('light');
            return;
        }
        localStorage.setItem('app-theme', currentThemeKey);
        // Apply theme variables to document root
        const root = document.documentElement;
        root.style.setProperty('--theme-bg', theme.bg);
        root.style.setProperty('--theme-text', theme.text);
        root.style.setProperty('--theme-accent', theme.accent);
        root.style.setProperty('--theme-editor-bg', theme.editorBg);
        
    },[currentThemeKey]);
    return (
        <ThemeContext.Provider value={{ currentThemeKey, setCurrentThemeKey, THEMES }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);