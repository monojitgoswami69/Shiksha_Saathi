document.addEventListener('DOMContentLoaded', () => {
    
    const CONSTANTS = {
        THEME_STORAGE_KEY: 'siksha-sathi-admin-theme',
    };
    
    // --- THEME MANAGEMENT ---
    const themeBtn = document.getElementById('themeModeBtn');
    let currentTheme = localStorage.getItem(CONSTANTS.THEME_STORAGE_KEY) || 'dark';

    const sunIcon = `<svg class="theme-mode-icon sun-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    const moonIcon = `<svg class="theme-mode-icon moon-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

    function getThemeColors() {
        const styles = getComputedStyle(document.documentElement);
        return {
            textColor: styles.getPropertyValue('--text-secondary'),
            gridColor: styles.getPropertyValue('--border-color'),
            primaryColor: styles.getPropertyValue('--primary-color'),
            secondaryColor: styles.getPropertyValue('--secondary-color'),
            warningColor: styles.getPropertyValue('--warning-color'),
            errorColor: styles.getPropertyValue('--error-color'),
        };
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        if (themeBtn) {
            themeBtn.innerHTML = sunIcon + moonIcon;
            themeBtn.classList.toggle('sun-active', theme === 'light');
        }
        // Re-initialize charts with new theme colors
        if (document.body.classList.contains('dashboard-body') && window.myCharts) {
            Object.values(window.myCharts).forEach(chart => chart.destroy());
            initCharts();
        }
    }

    function toggleTheme() {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem(CONSTANTS.THEME_STORAGE_KEY, currentTheme);
        applyTheme(currentTheme);
    }

    if (themeBtn) {
        themeBtn.addEventListener('click', toggleTheme);
    }
    


    // --- PAGE-SPECIFIC LOGIC ---
    if (document.body.classList.contains('login-page-body')) {
        applyTheme(currentTheme); // Apply theme on login page too
        const loginForm = document.getElementById('loginForm');
        if(loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                window.location.href = 'dashboard.html';
            });
        }
    } else if (document.body.classList.contains('dashboard-body')) {
        const navLinks = document.querySelectorAll('.nav-link');
        const pages = document.querySelectorAll('.page');
        const pageTitle = document.getElementById('pageTitle');
        const logoutBtn = document.getElementById('logoutBtn');

        const pageTitles = {
            'dashboard': 'Dashboard',
            'bot-management': 'Bot Management',
            'query-analytics': 'Query Analytics',
            'settings': 'Settings'
        };

        function showPage(pageId) {
            pages.forEach(page => {
                page.classList.toggle('active', page.id === pageId);
            });
            navLinks.forEach(link => {
                link.classList.toggle('active', link.dataset.page === pageId);
            });
            pageTitle.textContent = pageTitles[pageId] || 'Dashboard';
            window.location.hash = pageId;
        }
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const pageId = e.currentTarget.dataset.page;
                showPage(pageId);
            });
        });

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                window.location.href = 'admin_login.html';
            });
        }
        
        const initialPage = window.location.hash.substring(1) || 'dashboard';
        showPage(initialPage);
        
        const themeColorPicker = document.getElementById('themeColor');
        const themeColorText = document.getElementById('themeColorText');

        if(themeColorPicker && themeColorText) {
            themeColorPicker.addEventListener('input', (e) => {
                themeColorText.value = e.target.value;
            });
            themeColorText.addEventListener('input', (e) => {
                themeColorPicker.value = e.target.value;
            });
        }

        // --- CHARTS INITIALIZATION ---
        window.myCharts = {};
        function initCharts() {
            const colors = getThemeColors();
            Chart.defaults.color = colors.textColor;
            Chart.defaults.font.family = "'Inter', sans-serif";
            
            const queryVolumeCtx = document.getElementById('queryVolumeChart');
            if(queryVolumeCtx) {
                const gradient = queryVolumeCtx.getContext('2d').createLinearGradient(0, 0, 0, 300);
                gradient.addColorStop(0, 'rgba(102, 126, 234, 0.5)');
                gradient.addColorStop(1, 'rgba(102, 126, 234, 0)');

                window.myCharts.queryVolume = new Chart(queryVolumeCtx, {
                    type: 'line',
                    data: {
                        labels: ['Aug 1', 'Aug 5', 'Aug 10', 'Aug 15', 'Aug 20', 'Aug 25', 'Aug 30'],
                        datasets: [{
                            label: 'Queries',
                            data: [120, 190, 300, 500, 210, 330, 450],
                            borderColor: colors.primaryColor,
                            backgroundColor: gradient,
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: colors.primaryColor,
                            pointRadius: 4,
                            pointHoverRadius: 6,
                        }]
                    },
                    options: { 
                        responsive: true, 
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false }
                        },
                        scales: {
                            x: { grid: { color: colors.gridColor } },
                            y: { grid: { color: colors.gridColor } }
                        }
                    }
                });
            }

            const confusionHotspotsCtx = document.getElementById('confusionHotspotsChart');
            if(confusionHotspotsCtx) {
                window.myCharts.confusionHotspots = new Chart(confusionHotspotsCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Scholarships', 'Hostel Fees', 'Exam Schedule', 'Admissions'],
                        datasets: [{
                            label: 'Low Confidence Queries',
                            data: [30, 25, 20, 25],
                            backgroundColor: [colors.primaryColor, colors.secondaryColor, colors.warningColor, colors.errorColor],
                            borderWidth: 0,
                            hoverOffset: 10,
                        }]
                    },
                     options: { 
                         responsive: true, 
                         maintainAspectRatio: false,
                         cutout: '75%',
                         plugins: {
                             legend: {
                                 position: 'bottom',
                                 labels: {
                                     usePointStyle: true,
                                     pointStyle: 'rectRounded',
                                     padding: 20
                                 }
                             }
                         }
                    }
                });
            }
        }
        
        // Initial call after setting theme
        applyTheme(currentTheme);
    }
});

