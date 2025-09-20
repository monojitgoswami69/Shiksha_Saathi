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
            if (confusionHotspotsCtx) {
                // helper: convert hex like #667eea to rgba
                function hexToRgba(hex, alpha) {
                    if (!hex) return `rgba(0,0,0,${alpha})`;
                    const h = hex.replace('#', '').trim();
                    const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
                    const r = (bigint >> 16) & 255;
                    const g = (bigint >> 8) & 255;
                    const b = bigint & 255;
                    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                }

                const ctx = confusionHotspotsCtx.getContext('2d');
                const rawData = [30, 25, 20, 25];
                const baseColors = [colors.primaryColor, colors.secondaryColor, colors.warningColor, colors.errorColor];

                // Build gradients for each segment for a richer look
                const segmentFills = baseColors.map((c, i) => {
                    const g = ctx.createLinearGradient(0, 0, 0, 200);
                    g.addColorStop(0, hexToRgba(c.trim(), 0.95));
                    g.addColorStop(1, hexToRgba(c.trim(), 0.6));
                    return g;
                });

                // Helpers: parse hex or rgb strings, compute luminance, and mix with white for vibrancy
                function parseColorToRgb(input) {
                    if (!input) return { r: 255, g: 255, b: 255 };
                    const s = input.trim();
                    if (s.startsWith('rgb')) {
                        const nums = s.replace(/rgba?\(|\)/g, '').split(',').map(n => parseFloat(n));
                        return { r: nums[0], g: nums[1], b: nums[2] };
                    }
                    // hex
                    const h = s.replace('#', '');
                    const hex = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
                    const bigint = parseInt(hex, 16);
                    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
                }

                function rgbToHex({ r, g, b }) {
                    const toHex = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
                    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
                }

                function luminance({ r, g, b }) {
                    // relative luminance per ITU-R BT.709
                    const a = [r, g, b].map(v => {
                        v = v / 255;
                        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
                    });
                    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
                }

                function mixWithWhite(rgb, weight = 0.6) {
                    // weight 0..1, 1 => white
                    return {
                        r: Math.round(rgb.r + (255 - rgb.r) * weight),
                        g: Math.round(rgb.g + (255 - rgb.g) * weight),
                        b: Math.round(rgb.b + (255 - rgb.b) * weight),
                    };
                }

                function ensureVibrantColor(input) {
                    const rgb = parseColorToRgb(input);
                    const lum = luminance(rgb);
                    // If it's too dark against a dark background, mix with white for vibrancy
                    if (lum < 0.2) {
                        return rgbToHex(mixWithWhite(rgb, 0.7));
                    }
                    // If mid-dark, make it a bit lighter
                    if (lum < 0.45) {
                        return rgbToHex(mixWithWhite(rgb, 0.45));
                    }
                    // otherwise return original hex (normalize)
                    return rgbToHex(rgb);
                }

                // Mix color with black for darkening
                function mixWithBlack(rgb, weight = 0.5) {
                    return {
                        r: Math.round(rgb.r * (1 - weight)),
                        g: Math.round(rgb.g * (1 - weight)),
                        b: Math.round(rgb.b * (1 - weight)),
                    };
                }

                // Ensure the chosen center color has good contrast against the page background
                function ensureContrastColor(input) {
                    const rgb = parseColorToRgb(input);
                    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg-page') || '#ffffff';
                    const bgRgb = parseColorToRgb(bg);
                    const bgLum = luminance(bgRgb);
                    const clrLum = luminance(rgb);

                    // If background is light, prefer a darker-ish center color
                    if (bgLum > 0.55) {
                        if (clrLum > 0.5) {
                            // too light on light bg -> darken
                            return rgbToHex(mixWithBlack(rgb, 0.6));
                        }
                        return rgbToHex(rgb);
                    }

                    // If background is dark, prefer a lighter center color
                    if (bgLum <= 0.55) {
                        if (clrLum < 0.5) {
                            // too dark on dark bg -> lighten
                            return rgbToHex(mixWithWhite(rgb, 0.7));
                        }
                        return rgbToHex(rgb);
                    }

                    return rgbToHex(rgb);
                }

                // Plugin to draw text in center. By default shows total; when a segment is clicked it will display the clicked segment's percentage.
                const centerTextPlugin = {
                    id: 'centerText',
                    beforeDraw(chart) {
                        const { ctx, chartArea: { width, height } } = chart;
                        const total = rawData.reduce((s, v) => s + v, 0);
                        // Use per-chart stored value if present (set by click handler), otherwise show total
                        const display = chart._centerDisplay !== undefined ? chart._centerDisplay : (total + '%');
                        ctx.save();
                        // use stored center color if present (set on click), else use theme text color
                        const centerColor = chart._centerColor ? chart._centerColor.trim() : (getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#fff').trim();
                        ctx.fillStyle = centerColor;
                        ctx.font = '600 18px Inter, sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        // center coordinates
                        const meta = chart.getDatasetMeta(0);
                        const first = meta && meta.data && meta.data[0];
                        const x = (first && first.x) || (width / 2);
                        const y = (first && first.y) || (height / 2);
                        ctx.fillText(display, x, y);
                        ctx.restore();
                    }
                };

                window.myCharts.confusionHotspots = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Scholarships', 'Hostel Fees', 'Exam Schedule', 'Admissions'],
                        datasets: [{
                            label: 'Low Confidence Queries',
                            data: rawData,
                            backgroundColor: segmentFills,
                            borderColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-primary') || '#0b1220',
                            borderWidth: 2,
                            hoverOffset: 14,
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '68%',
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    usePointStyle: true,
                                    pointStyle: 'rectRounded',
                                    padding: 12
                                }
                            }
                        },
                        animation: {
                            animateRotate: true,
                            duration: 700
                        }
                    },
                    plugins: [centerTextPlugin]
                });

                // Click handler: when a segment is clicked, show its percentage in the center and color it to match the segment
                try {
                    const chartRef = window.myCharts.confusionHotspots;
                    const total = rawData.reduce((s, v) => s + v, 0);
                    ctx.canvas.addEventListener('click', (e) => {
                        const points = chartRef.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
                        if (points && points.length) {
                            const idx = points[0].index;
                            const val = rawData[idx];
                            const pct = Math.round((val / total) * 100);
                            chartRef._centerDisplay = pct + '%';
                            // store a color for center text (use baseColors for solid color)
                            // Use black for light theme and white for dark theme for clear, consistent contrast
                            const theme = document.documentElement.getAttribute('data-theme') || 'dark';
                            chartRef._centerColor = theme === 'light' ? '#000000' : '#ffffff';
                        } else {
                            chartRef._centerDisplay = total + '%';
                            const theme = document.documentElement.getAttribute('data-theme') || 'dark';
                            chartRef._centerColor = theme === 'light' ? '#000000' : '#ffffff';
                        }
                        chartRef.update();
                    });
                } catch (err) {
                    // Fail silently if event binding or chart API isn't supported in the environment
                    console.warn('Could not attach click handler for confusionHotspots chart center text.', err);
                }
            }
        }
        
        // Initial call after setting theme
        applyTheme(currentTheme);
        // --- MOBILE SIDEBAR TOGGLE ---
        const sidebar = document.querySelector('.sidebar');
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebarOverlay = document.getElementById('sidebarOverlay');

        function openSidebar() {
            if (!sidebar) return;
            sidebar.classList.add('open');
            sidebar.classList.remove('transform-translate');
            if (sidebarOverlay) sidebarOverlay.classList.add('active');
            if (sidebarToggle) sidebarToggle.setAttribute('aria-expanded', 'true');
        }

        function closeSidebar() {
            if (!sidebar) return;
            sidebar.classList.remove('open');
            sidebar.classList.add('transform-translate');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            if (sidebarToggle) sidebarToggle.setAttribute('aria-expanded', 'false');
        }

        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', (e) => {
                const isOpen = sidebar.classList.contains('open');
                if (isOpen) closeSidebar(); else openSidebar();
            });
        }

        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', closeSidebar);
        }

        // Close sidebar when navigation link clicked on small screens
        document.querySelectorAll('.sidebar .nav-link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) closeSidebar();
            });
        });
    }
});

