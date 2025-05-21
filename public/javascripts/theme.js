// Theme handling
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;
const themeIcon = themeToggle?.querySelector('i');

// Check for saved theme preference or use preferred color scheme
const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

// Apply the saved theme
const applyTheme = (theme) => {
    html.setAttribute('data-bs-theme', theme);
    if (themeIcon) {
        themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    // Add smooth transition for theme change
    document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
};

// Initialize theme
applyTheme(savedTheme);

// Toggle theme function
const toggleTheme = () => {
    const currentTheme = html.getAttribute('data-bs-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // Save to localStorage
    localStorage.setItem('theme', newTheme);
    
    // Apply new theme
    applyTheme(newTheme);
};

// Add event listener to theme toggle button
if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
}
