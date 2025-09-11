(function() {
    "use strict";

    // --- CONFIGURATION ---
    // IMPORTANT: Replace this with the actual URL where your widget's index.html is hosted.
    const WIDGET_URL = "https://your-widget-url.com/index.html?embed=1"; 
    
    // --- STATE ---
    let iframeVisible = false;
    let iframeLoaded = false;
    let widgetIframe;

    // --- DOM ELEMENTS ---
    const launcherButton = document.createElement('button');
    const notificationDot = document.createElement('div');

    function createLauncher() {
        launcherButton.id = 'siksha-sathi-launcher';
        launcherButton.setAttribute('aria-label', 'Open chat widget');
        launcherButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
        `;
        notificationDot.id = 'siksha-sathi-notification';
        launcherButton.appendChild(notificationDot);
        document.body.appendChild(launcherButton);
    }

    function createIframe() {
        widgetIframe = document.createElement('iframe');
        widgetIframe.id = 'siksha-sathi-iframe';
        widgetIframe.src = WIDGET_URL;
        widgetIframe.title = 'Shiksha Saathi Chat Widget';
        widgetIframe.setAttribute('allow', 'clipboard-write'); // For copy-paste functionality
        
        // Hide until loaded
        widgetIframe.style.opacity = '0';
        
        document.body.appendChild(widgetIframe);

        widgetIframe.onload = () => {
            iframeLoaded = true;
            // On load, check if it should be visible
            toggleIframeVisibility(iframeVisible, true); 
        };
    }
    
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #siksha-sathi-launcher {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background-color: #667eea;
                color: white;
                border: none;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9998;
                transition: transform 0.2s ease-out;
            }
            #siksha-sathi-launcher:hover {
                transform: scale(1.05);
            }
            #siksha-sathi-notification {
                position: absolute;
                top: 8px;
                right: 8px;
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background-color: #ef4444;
                border: 2px solid #667eea;
                transform: scale(0);
                transition: transform 0.2s ease;
            }
            #siksha-sathi-notification.visible {
                transform: scale(1);
            }
            #siksha-sathi-iframe {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: min(400px, 90vw);
                height: min(700px, 85vh);
                border: none;
                border-radius: 16px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
                z-index: 9999;
                transform-origin: bottom right;
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
                transform: scale(0.5);
                opacity: 0;
                pointer-events: none;
            }
            #siksha-sathi-iframe.visible {
                transform: scale(1);
                opacity: 1;
                pointer-events: auto;
            }
        `;
        document.head.appendChild(style);
    }
    
    function toggleIframeVisibility(show, force = false) {
        if (!force && !iframeLoaded) return;
        iframeVisible = typeof show === 'boolean' ? show : !iframeVisible;
        widgetIframe.classList.toggle('visible', iframeVisible);
        
        // Communicate with the iframe
        const message = { type: iframeVisible ? 'open-widget' : 'close-widget' };
        widgetIframe.contentWindow.postMessage(message, '*');
    }
    
    function handleHostPageMessages(event) {
        // Only accept messages from our own iframe
        if (event.source !== widgetIframe?.contentWindow) return;
        if (!event.data || !event.data.type) return;

        switch (event.data.type) {
            case 'widget-ready':
                // The widget is ready, can show launcher etc.
                break;
            case 'new-message':
                notificationDot.classList.add('visible');
                break;
        }
    }

    // --- INITIALIZATION ---
    function init() {
        if (document.getElementById('siksha-sathi-launcher')) {
            console.log('Siksha Saathi loader script already initialized.');
            return;
        }
        
        injectStyles();
        createLauncher();
        createIframe();
        
        launcherButton.addEventListener('click', () => toggleIframeVisibility());
        window.addEventListener('message', handleHostPageMessages);
    }

    // Wait for the page to be fully loaded to inject our widget
    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }

})();
