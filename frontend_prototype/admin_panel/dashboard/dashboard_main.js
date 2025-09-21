document.addEventListener('DOMContentLoaded', () => {
    // --- BUTTON RIPPLE EFFECT ---
    function createRipple(event) {
        const button = event.currentTarget;
        const circle = document.createElement('span');
        circle.className = 'ripple';
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        circle.style.width = circle.style.height = size + 'px';
        circle.style.left = (event.clientX - rect.left - size / 2) + 'px';
        circle.style.top = (event.clientY - rect.top - size / 2) + 'px';
        button.appendChild(circle);
        circle.addEventListener('animationend', () => circle.remove());
    }
    document.querySelectorAll('.btn, .btn-primary').forEach(btn => {
        btn.addEventListener('pointerdown', createRipple);
    });
    
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
            
            // --- Query Volume: SVG Area Chart (responsive, transparent background) ---
            (function initSvgAreaChart(){
                const svg = document.getElementById('area-chart');
                if (!svg) return;

                // sample 31-day data (keeps the original shape/content the user provided)
                const data = [
                    { day: 1, value: 23 }, { day: 2, value: 24 }, { day: 3, value: 21 }, { day: 4, value: 22 },
                    { day: 5, value: 19 }, { day: 6, value: 16 }, { day: 7, value: 12 }, { day: 8, value: 8 },
                    { day: 9, value: 5 }, { day: 10, value: 11 }, { day: 11, value: 25 }, { day: 12, value: 38 },
                    { day: 13, value: 45 }, { day: 14, value: 43 }, { day: 15, value: 35 }, { day: 16, value: 28 },
                    { day: 17, value: 24 }, { day: 18, value: 18 }, { day: 19, value: 15 }, { day: 20, value: 19 },
                    { day: 21, value: 25 }, { day: 22, value: 30 }, { day: 23, value: 28 }, { day: 24, value: 22 },
                    { day: 25, value: 15 }, { day: 26, value: 8 }, { day: 27, value: 12 }, { day: 28, value: 15 },
                    { day: 29, value: 16 }, { day: 30, value: 12 }, { day: 31, value: 10 }
                ];

                const svgNs = 'http://www.w3.org/2000/svg';

                function createPath(points) {
                    let path = `M ${points[0].x},${points[0].y}`;
                    for (let i = 0; i < points.length - 1; i++) {
                        const p0 = i > 0 ? points[i - 1] : points[i];
                        const p1 = points[i];
                        const p2 = points[i + 1];
                        const p3 = i < points.length - 2 ? points[i + 2] : p2;

                        const tension = 0.5;
                        const cp1x = p1.x + (p2.x - p0.x) / 6 * tension;
                        const cp1y = p1.y + (p2.y - p0.y) / 6 * tension;
                        const cp2x = p2.x - (p3.x - p1.x) / 6 * tension;
                        const cp2y = p2.y - (p3.y - p1.y) / 6 * tension;

                        path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
                    }
                    return path;
                }

                function draw() {
                    // clear
                    while (svg.firstChild) svg.removeChild(svg.firstChild);

                    // compute width/height from container and set an appropriate viewBox so the SVG scales responsively
                    const width = svg.clientWidth || svg.parentElement.clientWidth;
                    const height = svg.clientHeight || 360;
                    // set viewBox to enable consistent scaling and use preserveAspectRatio to maintain stretching behavior
                    svg.setAttribute('viewBox', `0 0 ${Math.max(320, Math.round(width))} ${Math.round(height)}`);
                    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                    if (width === 0 || height === 0) return;

                    const margin = { top: 18, right: 18, bottom: 36, left: 40 };
                    const graphWidth = width - margin.left - margin.right;
                    const graphHeight = height - margin.top - margin.bottom;

                    // scale factors for visual elements so the chart keeps the same feel on mobile
                    const k = Math.max(0.6, Math.min(1.0, graphWidth / 640));
                    const lineStroke = Math.max(1.6, 2.5 * k);
                    const circleHitR = Math.max(8, 10 * k);
                    const tooltipW = Math.max(84, Math.round(110 * k));
                    const tooltipH = Math.max(34, Math.round(44 * k));

                    const xScale = (day) => margin.left + (day - 1) * (graphWidth / 30);
                    const yScale = (value) => margin.top + (graphHeight - (value / 50) * graphHeight);

                    // defs + gradient (transparent background, gradient fill)
                    const defs = document.createElementNS(svgNs, 'defs');
                    const grad = document.createElementNS(svgNs, 'linearGradient');
                    grad.setAttribute('id', 'area-gradient');
                    grad.setAttribute('x1', '0'); grad.setAttribute('y1', '0');
                    grad.setAttribute('x2', '0'); grad.setAttribute('y2', '1');
                    const stop1 = document.createElementNS(svgNs, 'stop');
                    stop1.setAttribute('offset', '0%');
                    stop1.setAttribute('stop-color', '#A6FFCB');
                    stop1.setAttribute('stop-opacity', '0.6');
                    const stop2 = document.createElementNS(svgNs, 'stop');
                    stop2.setAttribute('offset', '100%');
                    stop2.setAttribute('stop-color', '#12D8FA');
                    stop2.setAttribute('stop-opacity', '0.08');
                    grad.appendChild(stop1);
                    grad.appendChild(stop2);
                    defs.appendChild(grad);
                    svg.appendChild(defs);

                    // group
                    const g = document.createElementNS(svgNs, 'g');
                    svg.appendChild(g);

                    // Y grid lines and labels (0..50 step 10)
                    for (let i = 0; i <= 50; i += 10) {
                        const y = yScale(i);
                        const line = document.createElementNS(svgNs, 'line');
                        line.setAttribute('x1', margin.left);
                        line.setAttribute('y1', y);
                        line.setAttribute('x2', width - margin.right);
                        line.setAttribute('y2', y);
                        line.setAttribute('class', 'axis-line');
                        g.appendChild(line);

                        const txt = document.createElementNS(svgNs, 'text');
                        txt.setAttribute('x', margin.left - 10);
                        txt.setAttribute('y', y + 4);
                        txt.setAttribute('text-anchor', 'end');
                        txt.setAttribute('class', 'axis-text');
                        txt.textContent = i;
                        g.appendChild(txt);
                    }

                    // X labels every 2 days
                    for (let i = 1; i <= 31; i++) {
                        if ((i - 1) % 2 === 0) {
                            const txt = document.createElementNS(svgNs, 'text');
                            txt.setAttribute('x', xScale(i));
                            txt.setAttribute('y', height - margin.bottom + 18);
                            txt.setAttribute('text-anchor', 'middle');
                            txt.setAttribute('class', 'axis-text');
                            txt.textContent = String(i).padStart(2, '0');
                            g.appendChild(txt);
                        }
                    }

                    const points = data.map(d => ({ x: xScale(d.day), y: yScale(d.value) }));


                    // area path (smooth)
                    const areaD = createPath(points) + ` L ${xScale(31)},${height - margin.bottom} L ${xScale(1)},${height - margin.bottom} Z`;
                    const areaPath = document.createElementNS(svgNs, 'path');
                    areaPath.setAttribute('d', areaD);
                    areaPath.setAttribute('fill', 'url(#area-gradient)');
                    areaPath.setAttribute('stroke', 'none');
                    areaPath.style.opacity = '0'; // fade in after line animates
                    g.appendChild(areaPath);

                    // line path on top
                    const lineD = createPath(points);
                    const linePath = document.createElementNS(svgNs, 'path');
                    linePath.setAttribute('d', lineD);
                    linePath.setAttribute('fill', 'none');
                    linePath.setAttribute('stroke', '#A6FFCB');
                    linePath.setAttribute('stroke-width', String(lineStroke));
                    g.appendChild(linePath);

                    // --- Animate the line draw ---
                    const totalLength = linePath.getTotalLength();
                    linePath.style.strokeDasharray = totalLength;
                    linePath.style.strokeDashoffset = totalLength;
                    linePath.style.transition = 'none';
                    areaPath.style.transition = 'opacity 0.5s ease';

                    // Animate with requestAnimationFrame
                    let start = null;
                    const duration = 900; // ms
                    function animateLineDraw(ts) {
                        if (!start) start = ts;
                        const elapsed = ts - start;
                        const progress = Math.min(elapsed / duration, 1);
                        linePath.style.strokeDashoffset = totalLength * (1 - progress);
                        if (progress < 1) {
                            requestAnimationFrame(animateLineDraw);
                        } else {
                            linePath.style.strokeDashoffset = 0;
                            areaPath.style.opacity = '1';
                        }
                    }
                    // Start with area hidden, then fade in after line animates
                    areaPath.style.opacity = '0';
                    requestAnimationFrame(animateLineDraw);

                    // tooltip group
                    const tooltip = document.createElementNS(svgNs, 'g');
                    tooltip.setAttribute('class', 'tooltip-group');
                    const tooltipRect = document.createElementNS(svgNs, 'rect');
                    tooltipRect.setAttribute('class', 'tooltip-rect');
                    tooltipRect.setAttribute('width', String(tooltipW));
                    tooltipRect.setAttribute('height', String(tooltipH));
                    const t1 = document.createElementNS(svgNs, 'text');
                    t1.setAttribute('class', 'tooltip-text');
                    // position tooltip text with small padding
                    t1.setAttribute('x', String(12 * k));
                    t1.setAttribute('y', String(Math.round(14 * k + 4)));
                    const t2 = document.createElementNS(svgNs, 'text');
                    t2.setAttribute('class', 'tooltip-text');
                    t2.setAttribute('x', String(12 * k));
                    t2.setAttribute('y', String(Math.round((14 * k) + (12 * k))));
                    tooltip.appendChild(tooltipRect);
                    tooltip.appendChild(t1);
                    tooltip.appendChild(t2);
                    g.appendChild(tooltip);

                    // interaction circles
                    data.forEach(d => {
                        const c = document.createElementNS(svgNs, 'circle');
                        c.setAttribute('cx', xScale(d.day));
                        c.setAttribute('cy', yScale(d.value));
                        // visual radius kept smaller; hit radius maintained by the element
                        c.setAttribute('r', String(Math.max(6, Math.round(circleHitR * 0.9))));
                        c.setAttribute('class', 'interaction-circle');

                        c.addEventListener('mouseover', () => {
                            t1.textContent = `${String(d.day).padStart(2, '0')}/01/2020`;
                            t2.textContent = `${d.value} queries`;

                            let tx = xScale(d.day) - Math.round(tooltipW / 2);
                            let ty = yScale(d.value) - Math.round(tooltipH + 14 * k);
                            if (tx < 6) tx = 6;
                            if (tx + tooltipW > width) tx = width - tooltipW - 6;

                            tooltip.setAttribute('transform', `translate(${tx}, ${ty})`);
                            tooltip.classList.add('visible');
                        });
                        c.addEventListener('mouseout', () => {
                            tooltip.classList.remove('visible');
                        });

                        g.appendChild(c);
                    });
                }

                // initial draw and resize handling (use a named listener so it can be removed)
                draw();
                let resizeTimer = null;
                const _areaChartResizeListener = () => {
                    if (resizeTimer) clearTimeout(resizeTimer);
                    resizeTimer = setTimeout(() => draw(), 120);
                };
                window.addEventListener('resize', _areaChartResizeListener);

                // expose a simple destroy hook to be consistent with Chart life-cycle
                window.myCharts.queryVolume = {
                    destroy() {
                        try { window.removeEventListener('resize', _areaChartResizeListener); } catch (e) {}
                    }
                };
            })();

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

