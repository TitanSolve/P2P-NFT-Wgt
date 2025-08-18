import React, { createContext, useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";

const ThemeContext = createContext();

export const ThemeProvider = ({ children, widgetApi = null }) => {
    const [theme, setTheme] = useState(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("theme") || "light";
        }
        return "light";
    });

    // Listen for theme changes from widget API provider
    useEffect(() => {
        if (!widgetApi) {
            console.log('🎨 No widget API available, using localStorage/system preference');
            return;
        }

        const handleThemeChange = async () => {
            try {
                console.log('🎨 Checking for theme from widget API...');
                
                // Try to get theme from widget API parameters
                const widgetTheme = widgetApi.widgetParameters?.theme;
                if (widgetTheme && (widgetTheme === 'light' || widgetTheme === 'dark')) {
                    console.log('🎨 Setting theme from widget parameters:', widgetTheme);
                    setTheme(widgetTheme);
                    return;
                }

                // Try to listen for theme state events
                try {
                    const themeEvents = await widgetApi.receiveStateEvents('org.matrix.msc2871.theme');
                    if (themeEvents && themeEvents.length > 0) {
                        const latestTheme = themeEvents[themeEvents.length - 1];
                        const themeValue = latestTheme.content?.theme;
                        if (themeValue && (themeValue === 'light' || themeValue === 'dark')) {
                            console.log('🎨 Setting theme from state event:', themeValue);
                            setTheme(themeValue);
                            return;
                        }
                    }
                } catch (error) {
                    console.log('🎨 No theme state events available:', error.message);
                }

                // Check if there's a theme in the URL parameters (common in Element)
                const urlParams = new URLSearchParams(window.location.search);
                const urlTheme = urlParams.get('theme');
                if (urlTheme && (urlTheme === 'light' || urlTheme === 'dark')) {
                    console.log('🎨 Setting theme from URL parameter:', urlTheme);
                    setTheme(urlTheme);
                    return;
                }

                // Check for system dark mode preference if no explicit theme is set
                const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                const systemTheme = prefersDark ? 'dark' : 'light';
                console.log('🎨 Setting theme from system preference:', systemTheme);
                setTheme(systemTheme);

            } catch (error) {
                console.warn('🎨 Error getting theme from widget API:', error);
                // Fallback to localStorage or system preference
                const storedTheme = localStorage.getItem("theme");
                if (storedTheme && (storedTheme === 'light' || storedTheme === 'dark')) {
                    console.log('🎨 Fallback to stored theme:', storedTheme);
                    setTheme(storedTheme);
                } else {
                    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                    const fallbackTheme = prefersDark ? 'dark' : 'light';
                    console.log('🎨 Fallback to system preference:', fallbackTheme);
                    setTheme(fallbackTheme);
                }
            }
        };

        // Set initial theme
        handleThemeChange();

        // Listen for theme changes in the widget API (if supported)
        const handleThemeEvents = (event) => {
            if (event.detail?.type === 'org.matrix.msc2871.theme') {
                const newTheme = event.detail.content?.theme;
                if (newTheme && (newTheme === 'light' || newTheme === 'dark')) {
                    console.log('🎨 Theme changed via widget API event:', newTheme);
                    setTheme(newTheme);
                }
            }
        };

        // Listen for widget API theme events (may not be supported)
        try {
            widgetApi.on('org.matrix.msc2871.theme', handleThemeEvents);
        } catch {
            console.log('🎨 Widget API does not support theme event listening');
        }

        return () => {
            try {
                widgetApi.off('org.matrix.msc2871.theme', handleThemeEvents);
            } catch {
                // Ignore errors when removing listeners
            }
        };
    }, [widgetApi]);

    useEffect(() => {
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(theme);
        localStorage.setItem("theme", theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === "light" ? "dark" : "light"));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

ThemeProvider.propTypes = {
    children: PropTypes.node.isRequired,
    widgetApi: PropTypes.object,
};

export const useTheme = () => useContext(ThemeContext);