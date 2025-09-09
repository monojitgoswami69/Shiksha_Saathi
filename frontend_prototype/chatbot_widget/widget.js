/**
 * Siksha Sathi Widget - JavaScript functionality for embeddable chatbot
 * Provides core chat functionality and postMessage API for iframe integration
 */

const backendUrl = "https://shiksha-saathi-backend.vercel.app";

class SikshaSathiWidget {
    constructor() {
        this.isEmbedded = this.detectEmbedMode();
        this.isOpen = true;
        this.messages = [];
        this.isWaitingForResponse = false;
        this.currentTheme = 'dark'; // Initialize theme
        // Configurable synthetic response delay (ms). Set to 0 to disable artificial delay.
        this.simulatedResponseDelay = 0;

        // Initialize widget
        this.initializeTheme();
        this.initializeElements();
        this.setupEventListeners();
        this.setupEmbedCommunication();

        // Notify parent if embedded
        if (this.isEmbedded) {
            this.notifyParent('widget-ready', {
                type: 'iframe-ready',
                timestamp: new Date().toISOString()
            });
        }

        console.log('Siksha Saathi Widget initialized', {
            isEmbedded: this.isEmbedded,
            version: '1.0.1'
        });
    }

    // Detect embed mode (iframe or URL param)
    detectEmbedMode() {
        const inIframe = window.self !== window.top;
        const urlParams = new URLSearchParams(window.location.search);
        const embedParam = urlParams.get('embed') === '1';
        return inIframe || embedParam;
    }

    // Initialize DOM element references
    initializeElements() {
        this.chatContainer = document.querySelector('.widget-chatbot-container');
        this.messagesContainer = document.querySelector('.chat-messages');
        this.sendBtn = document.querySelector('#sendBtn'); // now an <img> acting as button
        this.headerTitle = document.querySelector('.header-title h1');
        this.themeModeBtn = document.querySelector('#themeModeBtn');
        this.suggestionChips = document.querySelectorAll('.suggestion-chip');
        this.overlayInput = document.querySelector('#overlayInput');

        if (this.sendBtn && this.overlayInput) {
            // Click handler for the image acting as button
            this.sendBtn.addEventListener('click', () => {
                if (!this.isWaitingForResponse && !this.sendBtn.classList.contains('inactive')) {
                    this.handleSendMessage();
                }
            });

            // Allow keyboard activation when focused
            this.sendBtn.tabIndex = 0;
            this.sendBtn.addEventListener('keydown', (e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !this.sendBtn.classList.contains('inactive')) {
                    e.preventDefault();
                    this.handleSendMessage();
                }
            });

            this.updateSendBtnState();
        }

        if (this.overlayInput) this.setupContentEditableInput();

        this.setTheme(this.currentTheme, true);
    }

    // Setup contenteditable input behavior and handlers
    setupContentEditableInput() {
        if (!this.overlayInput) return;

        const debouncedInputHandler = () => {
            this.autoResizeInput();
            this.updateSendBtnState();
            this.updatePlaceholderVisibility();
            this.notifyHeightChange();
        };

        this.overlayInput.addEventListener('input', this.debounce(debouncedInputHandler, 50));

        this.overlayInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!this.isWaitingForResponse) this.handleSendMessage();
            }
        });

        this.overlayInput.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text');
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(text));
            range.collapse(false);
        });

        this.autoResizeInput();
        
        // Add mobile-specific focus handling for better keyboard behavior
        this.overlayInput.addEventListener('focus', () => {
            setTimeout(() => this.handleMobileViewportChange(), 300);
        });
        
        this.overlayInput.addEventListener('blur', () => {
            if ('visualViewport' in window && this.chatContainer) {
                this.chatContainer.style.height = '';
            }
        });
    }

    // Register UI event listeners
    setupEventListeners() {
        if (this.themeModeBtn) {
            this.themeModeBtn.addEventListener('click', () => {
                const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
                this.setTheme(nextTheme);
            });
        }

        this.suggestionChips.forEach(chip => {
            chip.addEventListener('click', () => {
                if (!this.isWaitingForResponse) {
                    const text = chip.dataset.suggestion || chip.textContent.trim();
                    if (this.overlayInput) this.overlayInput.textContent = text;
                    this.handleSendMessage();
                }
            });
        });

        window.addEventListener('resize', () => this.notifyHeightChange());
        
        if ('visualViewport' in window) {
            window.visualViewport.addEventListener('resize', () => this.handleMobileViewportChange());
        }
        
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleMobileViewportChange();
                this.notifyHeightChange();
            }, 100);
        });
    }

    // Embed communication (postMessage)
    setupEmbedCommunication() {
        if (!this.isEmbedded) return;
        window.addEventListener('message', (event) => {
            if (!event.data || !event.data.type) return;
            switch (event.data.type) {
                case 'open-widget': this.openWidget(); break;
                case 'close-widget': this.closeWidget(); break;
                case 'toggle-widget': this.toggleWidget(); break;
                case 'send-message':
                    if (event.data.message && this.overlayInput) {
                        this.overlayInput.textContent = event.data.message;
                        this.handleSendMessage();
                    }
                    break;
                case 'set-theme': this.setTheme(event.data.theme); break;
                case 'get-status':
                    this.notifyParent('status-response', { isOpen: this.isOpen, hasUnread: false });
                    break;
            }
        });
    }
    
    notifyParent(type, data = {}) {
        if (!this.isEmbedded) return;
        const message = { type, source: 'siksha-sathi-widget', timestamp: new Date().toISOString(), ...data };
        window.parent.postMessage(message, '*');
    }
    
    // Notify parent with updated height
    notifyHeightChange() {
        if (!this.isEmbedded) return;
        const height = Math.max(this.chatContainer.scrollHeight, 400);
        this.notifyParent('height-changed', { height });
    }
    
    // Handle mobile viewport changes (keyboard show/hide)
    handleMobileViewportChange() {
        if (this.overlayInput && document.activeElement === this.overlayInput) {
            setTimeout(() => this.overlayInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
        }
        
        if ('visualViewport' in window) {
            const viewportHeight = window.visualViewport.height;
            if (this.chatContainer && viewportHeight) {
                this.chatContainer.style.height = `${viewportHeight}px`;
            }
        }
    }
    
    handleSendMessage() {
        if (!this.overlayInput) return;
        
        const message = this.overlayInput.textContent.trim();
        if (!message || this.isWaitingForResponse) return;
        
        this.isWaitingForResponse = true;
        
        this.addMessage(message, 'user');
        
        this.overlayInput.textContent = '';
        this.autoResizeInput();
        this.updateSendBtnState();
        this.updatePlaceholderVisibility();
        
        this.showTypingIndicator();
        
        // This now calls the backend directly without an artificial delay
        this.getBotResponse(message);
        
        this.notifyParent('message-sent', { message });
        this.notifyHeightChange();
    }
    
    addMessage(content, sender = 'bot', enableStreaming = false) {
        // Hide welcome message when first message is added
        const welcomeMessage = this.messagesContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }

        if (sender === 'user') {
            // Keep user messages as bubbles
            const processedContent = this.escapeHtml(content);
            const messageElement = document.createElement('div');
            messageElement.className = `message ${sender}`;
            messageElement.innerHTML = `
                <div class="message-content">
                    <div class="message-text">${processedContent}</div>
                </div>
            `;

            this.messagesContainer.appendChild(messageElement);
            this.scrollToBottom();
            return messageElement;
        } else {
            // Render bot responses directly to the page (non-bubbled)
            const botElement = document.createElement('div');
            botElement.className = 'bot-response';
            botElement.innerHTML = `
                <div class="bot-response-content"></div>
            `;

            this.messagesContainer.appendChild(botElement);
            const contentDiv = botElement.querySelector('.bot-response-content');

            if (enableStreaming) {
                // Stream the response with typing effect
                this.streamBotResponse(content, contentDiv, botElement);
            } else {
                // Show response immediately (non-streaming)
                const processedContent = this.renderMarkdown(content);
                contentDiv.innerHTML = processedContent;
                this.addCodeCopyButtons(botElement);
            }

            this.scrollToBottom();
            return botElement;
        }
    }

    // Stream bot response with typing effect
    streamBotResponse(content, contentDiv, botElement) {
        const chars = content.split('');
        let currentIndex = 0;
        let currentText = '';
        
        const typeChar = () => {
            if (currentIndex < chars.length) {
                currentText += chars[currentIndex];
                currentIndex++;
                
                // Render markdown for the current text
                const processedContent = this.renderMarkdown(currentText);
                contentDiv.innerHTML = processedContent;
                
                // Scroll to bottom to follow the typing
                this.scrollToBottom();
                
                // Continue typing with a small delay
                setTimeout(typeChar, 1); // Adjust speed here (1ms = fastest)
            } else {
                // Streaming complete - add code copy buttons
                this.addCodeCopyButtons(botElement);
            }
        };
        
        typeChar();
    }

    // Render markdown content with safety measures
    renderMarkdown(content) {
        if (typeof marked === 'undefined') {
            console.warn('Marked library not loaded, falling back to escaped HTML');
            return this.escapeHtml(content);
        }

        try {
            marked.setOptions({
                breaks: true,
                gfm: true,
                sanitize: false,
            });
            return this.sanitizeHtml(marked.parse(content));
        } catch (error) {
            console.error('Markdown rendering failed:', error);
            return this.escapeHtml(content);
        }
    }

    // Basic HTML sanitization
    sanitizeHtml(html) {
        return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>|on\w+\s*=\s*"[^"]*"|on\w+\s*=\s*'[^']*'|javascript:/gi, '');
    }

    // Add copy buttons to code blocks
    addCodeCopyButtons(messageElement) {
        const codeBlocks = messageElement.querySelectorAll('pre');
        codeBlocks.forEach(pre => {
            const code = pre.querySelector('code');
            if (!code) return;

            const container = document.createElement('div');
            container.className = 'code-block-container';
            pre.parentNode.insertBefore(container, pre);
            container.appendChild(pre);

            const button = document.createElement('button');
            button.className = 'code-copy-btn';
            button.textContent = 'Copy';
            button.setAttribute('aria-label', 'Copy code to clipboard');
            container.appendChild(button);

            button.addEventListener('click', () => this.copyCodeToClipboard(code.innerText, button));
        });
    }

    // Copy code to clipboard
    async copyCodeToClipboard(code, button) {
        if (button.classList.contains('copied')) return;

        try {
            await navigator.clipboard.writeText(code);
            button.textContent = 'Copied!';
            button.classList.add('copied');
            
            setTimeout(() => {
                button.textContent = 'Copy';
                button.classList.remove('copied');
            }, 2000);
            
        } catch (err) {
            console.error('Failed to copy code: ', err);
            button.textContent = 'Failed';
            setTimeout(() => {
                button.textContent = 'Copy';
            }, 2000);
        }
    }

    showTypingIndicator() {
        // CORRECTED: Use this.messagesContainer to find the element
        if (this.messagesContainer.querySelector('.typing-indicator')) return;
        
        const typingDots = document.createElement('div');
        typingDots.className = 'typing-indicator';
        typingDots.innerHTML = '<span></span><span></span><span></span>';
        this.messagesContainer.appendChild(typingDots);
        
        this.scrollToBottom();
    }
    
    hideTypingIndicator() {
        const typingIndicator = this.messagesContainer.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    async getBotResponse(userMessage) {
        try {
            const response = await fetch(`${backendUrl}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage })
            });

            if (!response.ok) {
                const errorData = await response.json();
                // CORRECTED: Use errorData.error to match backend
                throw new Error(`HTTP error! status: ${response.status}, details: ${errorData.error || 'Unknown error'}`);
            }

            const data = await response.json();
            this.hideTypingIndicator();
            // CORRECTED: Use data.reply to match backend and enable streaming
            this.addMessage(data.reply, 'bot', true); // Enable streaming

        } catch (error) {
            console.error('Failed to get response from backend:', error);
            this.hideTypingIndicator();
            const fallbackResponse = "I'm having trouble connecting right now. Please try again in a moment.";
            this.addMessage(fallbackResponse, 'bot', true); // Enable streaming for fallback too
        }
        
        this.isWaitingForResponse = false;
        this.updateSendBtnState();
        if (this.overlayInput) this.overlayInput.focus();
        this.notifyHeightChange();
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    scrollToBottom() {
        if (this.messagesContainer) {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    }
    
    autoResizeInput() {
        if (!this.overlayInput) return;
        const hasContent = this.overlayInput.textContent.length > 0;
        this.overlayInput.classList.toggle('has-content', hasContent);
        this.notifyHeightChange();
    }
    
    updateSendBtnState() {
        if (!this.sendBtn || !this.overlayInput) return;
        const hasContent = this.overlayInput.textContent.trim().length > 0;
        const isButtonActive = hasContent && !this.isWaitingForResponse;
        this.sendBtn.classList.toggle('inactive', !isButtonActive);
        // Update ARIA state since <img> does not support disabled
        this.sendBtn.setAttribute('aria-disabled', String(!isButtonActive));
    }
    
    updatePlaceholderVisibility() {
        if (!this.overlayInput) return;
        if (this.overlayInput.textContent.trim() === '') {
            this.overlayInput.innerHTML = '';
        }
    }
    
    openWidget() {
        this.isOpen = true;
        if (this.chatContainer) this.chatContainer.style.display = 'flex';
        this.notifyParent('widget-opened', { isOpen: true });
        this.notifyHeightChange();
    }
    
    closeWidget() {
        this.isOpen = false;
        if (this.chatContainer) this.chatContainer.style.display = 'none';
        this.notifyParent('widget-closed', { isOpen: false });
    }
    
    toggleWidget() {
        this.isOpen ? this.closeWidget() : this.openWidget();
    }
    
    initializeTheme() {
        try {
            const savedTheme = localStorage.getItem('siksha-sathi-theme');
            const theme = savedTheme === 'light' ? 'light' : 'dark';
            this.setTheme(theme, true);
        } catch (error) {
            console.error('Error initializing theme:', error);
            this.setTheme('dark', true);
        }
    }

    setTheme(theme, isInitialization = false) {
        if (theme !== 'light' && theme !== 'dark') return;
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);

        // Runtime enforcement: set inline backgrounds when dark theme is active
        // This ensures the desired background color applies even if other CSS or inline
        // styles would otherwise override the CSS variables.
        try {
            if (theme === 'dark') {
                document.documentElement.style.background = '#010409';
                if (document.body) document.body.style.background = '#010409';
                const container = document.querySelector('.widget-chatbot-container');
                if (container) container.style.background = '#010409';
            } else {
                document.documentElement.style.background = '';
                if (document.body) document.body.style.background = '';
                const container = document.querySelector('.widget-chatbot-container');
                if (container) container.style.background = '';
            }
        } catch (err) {
            console.warn('Unable to set inline background for theme enforcement', err);
        }

        if (!isInitialization) {
            try {
                localStorage.setItem('siksha-sathi-theme', theme);
            } catch (error) {
                console.error('Error saving theme preference:', error);
            }
        }

        if (this.themeModeBtn) {
            this.themeModeBtn.classList.toggle('sun-active', theme === 'light');
            this.themeModeBtn.classList.toggle('moon-active', theme === 'dark');
        }

        this.notifyParent('theme-changed', { theme });
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    destroy() {
        window.removeEventListener('resize', this.notifyHeightChange);
        if ('visualViewport' in window) {
            window.visualViewport.removeEventListener('resize', this.handleMobileViewportChange);
        }
        window.removeEventListener('orientationchange', this.handleMobileViewportChange);
        this.messages = [];
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        window.sikshaSathiWidget = new SikshaSathiWidget();
    } catch (error) {
        console.error('Failed to initialize Siksha Sathi Widget:', error);
    }
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SikshaSathiWidget;
}