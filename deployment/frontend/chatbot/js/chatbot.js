/**
 * Shiksha Saathi Chatbot Main Class
 */
class ShikshaSaathiChatbot {
    constructor() {
        this.backendUrl = "https://shiksha-saathi-backend.vercel.app";
        this.isWaitingForResponse = false;
        this.selectedLanguage = 'en';
        this.welcomeDismissed = false;
        this.sessionId = ShikshaSaathiUtils.generateSessionId();

        this.dom = this.initializeDOMElements();
        this.init();
    }

    initializeDOMElements() {
        return {
            chatMessages: document.getElementById('chatMessages'),
            messageInput: document.getElementById('messageInput'),
            sendBtn: document.getElementById('sendBtn'),
            themeModeBtn: document.getElementById('themeModeBtn'),
            languageSelector: document.getElementById('languageSelector'),
            languageBtn: document.getElementById('languageBtn'),
            languageText: document.getElementById('languageText'),
            languageDropdown: document.getElementById('languageDropdown'),
            languageSearch: document.getElementById('languageSearch'),
            languageOptions: document.getElementById('languageOptions'),
            inputPane: document.getElementById('inputPane'),
            welcomeScreen: document.getElementById('welcomeScreen')
        };
    }

    init() {
        this.populateLanguageOptions();
        this.setupEventListeners();
        ShikshaSaathiUtils.setTheme(ShikshaSaathiUtils.getStoredTheme());
        this.updateUILanguage(this.selectedLanguage);
        this.handleSendButtonState();
        this.startSession();
    }

    // Session Management
    async startSession() {
        try {
            const response = await fetch(`${this.backendUrl}/session/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: this.sessionId })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Failed to start session:', errorText);
                this.showNotification('Could not initialize a new chat session.', 'error');
                return;
            }
            
            const data = await response.json();
            console.log('Session status:', data.status);
        } catch (error) {
            console.error('Error starting session:', error);
            this.showNotification('Error connecting to the server.', 'error');
        }
    }

    // Event Listeners Setup
    setupEventListeners() {
        // Send button and input handling
        this.dom.sendBtn.addEventListener('click', () => this.sendMessage());
        
        this.dom.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
            if (e.key === 'Escape') {
                this.dom.messageInput.textContent = '';
                this.handleSendButtonState();
            }
        });

        this.dom.messageInput.addEventListener('input', () => {
            this.handleSendButtonState();
            this.handleInputResize();
        });

        // Also handle paste events for placeholder fix
        this.dom.messageInput.addEventListener('paste', () => {
            setTimeout(() => this.handleSendButtonState(), 0);
        });

        this.dom.messageInput.addEventListener('focus', () => {
            this.closeLanguageDropdown();
            this.handleMobileKeyboard();
        });

        // Theme toggle
        this.dom.themeModeBtn.addEventListener('click', () => {
            this.animateThemeButton();
            ShikshaSaathiUtils.toggleTheme();
        });

        // Language and suggestion setup
        this.setupLanguageSelector();
        this.setupSuggestionChips();

        // Viewport and error handling
        this.setupViewportHandling();
        this.setupErrorHandling();
    }

    setupLanguageSelector() {
        this.dom.languageBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleLanguageDropdown();
        });

        document.addEventListener('click', (e) => {
            if (!this.dom.languageSelector.contains(e.target)) {
                this.closeLanguageDropdown();
            }
        });

        this.dom.languageOptions.addEventListener('click', (e) => {
            const option = e.target.closest('.language-option');
            if (option) {
                this.selectLanguage(option.dataset.lang);
            }
        });

        const debouncedFilter = ShikshaSaathiUtils.debounce((value) => {
            this.filterLanguages(value);
        }, 150);

        this.dom.languageSearch.addEventListener('input', (e) => {
            debouncedFilter(e.target.value);
        });
    }

    setupSuggestionChips() {
        this.dom.welcomeScreen.querySelectorAll('.suggestion-chip').forEach((chip) => {
            chip.addEventListener('click', () => {
                this.dom.messageInput.textContent = chip.dataset.suggestion;
                this.handleSendButtonState();
                this.sendMessage();
            });
        });
    }

    setupViewportHandling() {
        let resizeTimeout;
        const handleViewportChange = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleViewportResize();
            }, 100);
        };

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleViewportChange);
        } else {
            window.addEventListener('resize', handleViewportChange);
        }
    }

    setupErrorHandling() {
        window.addEventListener('error', this.handleGlobalError.bind(this), true);
        window.addEventListener('unhandledrejection', this.handleGlobalError.bind(this));
    }

    // Message Handling
    sendMessage() {
        const messageText = this.dom.messageInput.textContent.trim();
        if (!messageText || this.isWaitingForResponse) return;

        const proceed = () => {
            this.isWaitingForResponse = true;
            this.handleSendButtonState();
            this.addMessage('user', messageText);
            this.dom.messageInput.textContent = '';
            this.handleInputResize();
            this.showTypingIndicator();
            this.streamBotResponse(messageText);
        };

        if (!this.welcomeDismissed) {
            this.dismissWelcome().then(proceed);
        } else {
            proceed();
        }
    }

    async streamBotResponse(userMessage) {
        const botMessageEl = this.addMessage('bot', '', { isStreaming: true });
        const markdownContent = botMessageEl.querySelector('.markdown-content');
        
        let fullReply = '';
        const charQueue = [];
        let rendererInterval = null;

        try {
            // Character renderer for typing effect
            rendererInterval = setInterval(() => {
                if (charQueue.length > 0) {
                    const charsToAdd = charQueue.splice(0, 6).join('');
                    fullReply += charsToAdd;
                    markdownContent.innerHTML = ShikshaSaathiUtils.renderMarkdown(fullReply);
                    this.scrollToBottomIfAtBottom();
                }
            }, 8);

            // Network fetch
            const response = await fetch(`${this.backendUrl}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    session_id: this.sessionId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            await this.hideTypingIndicator();

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    const finalCheck = setInterval(() => {
                        if (charQueue.length === 0) {
                            clearInterval(rendererInterval);
                            clearInterval(finalCheck);
                            this.isWaitingForResponse = false;
                            this.handleSendButtonState();
                            ShikshaSaathiUtils.announceToScreenReader(fullReply);
                        }
                    }, 50);
                    break;
                }
                const chunk = decoder.decode(value, { stream: true });
                charQueue.push(...chunk.split(''));
            }

        } catch (error) {
            if (rendererInterval) clearInterval(rendererInterval);
            await this.hideTypingIndicator();
            const errorMessage = "Sorry, an error occurred. Please try again.";
            markdownContent.innerHTML = ShikshaSaathiUtils.renderMarkdown(errorMessage);
            this.isWaitingForResponse = false;
            this.handleSendButtonState();
            ShikshaSaathiUtils.announceToScreenReader(errorMessage);
            console.error('Streaming failed:', error);
        }
    }

    // UI Methods
    addMessage(sender, text, options = {}) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${sender}`;
        if (options.isError) {
            messageEl.classList.add('error');
        }

        messageEl.innerHTML = `
            <div class="message-wrapper">
                <div class="message-content">
                    <div class="markdown-content"></div>
                </div>
            </div>
        `;

        const markdownContent = messageEl.querySelector('.markdown-content');
        if (sender === 'bot') {
            if (!options.isStreaming) {
                markdownContent.innerHTML = ShikshaSaathiUtils.renderMarkdown(text);
            }
        } else {
            markdownContent.textContent = text;
        }

        const container = this.dom.chatMessages;
        const shouldAutoScroll = (container.scrollHeight - (container.scrollTop + container.clientHeight)) < 80;
        
        this.dom.chatMessages.appendChild(messageEl);
        requestAnimationFrame(() => messageEl.classList.add('message-enter'));
        
        if (shouldAutoScroll) this.scrollToBottom();
        
        if (sender === 'bot' && !options.isStreaming) {
            ShikshaSaathiUtils.announceToScreenReader(text);
        }
        
        return messageEl;
    }

    showTypingIndicator() {
        if (this.dom.chatMessages.querySelector('.typing-indicator-container')) return;
        
        const typingEl = document.createElement('div');
        typingEl.className = 'message bot typing-indicator-container';
        typingEl.innerHTML = `
            <div class="message-wrapper">
                <div class="message-content">
                    <div class="typing-indicator">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                    </div>
                </div>
            </div>
        `;
        
        this.dom.chatMessages.appendChild(typingEl);
        requestAnimationFrame(() => typingEl.classList.add('message-enter'));
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        return new Promise(resolve => {
            const indicator = this.dom.chatMessages.querySelector('.typing-indicator-container');
            if (!indicator) return resolve();
            
            indicator.classList.remove('message-enter');
            indicator.classList.add('is-hiding');
            
            const done = () => {
                indicator.remove();
                resolve();
            };
            
            indicator.addEventListener('animationend', done, { once: true });
            setTimeout(done, 400);
        });
    }

    dismissWelcome() {
        return new Promise(resolve => {
            if (this.welcomeDismissed) return resolve();
            
            const el = this.dom.welcomeScreen;
            if (!el) {
                this.welcomeDismissed = true;
                return resolve();
            }
            
            el.style.animation = 'fadeOut 0.3s ease-out forwards';
            el.addEventListener('animationend', () => {
                el.remove();
                this.welcomeDismissed = true;
                requestAnimationFrame(() => {
                    this.scrollToBottom();
                    setTimeout(() => resolve(), 30);
                });
            }, { once: true });
        });
    }

    // Language Management
    populateLanguageOptions() {
        this.dom.languageOptions.innerHTML = '';
        ShikshaSaathiUtils.LANGUAGES.forEach(lang => {
            const li = document.createElement('li');
            li.className = 'language-option';
            li.dataset.lang = lang.code;
            li.textContent = lang.native;
            li.setAttribute('role', 'option');
            li.setAttribute('tabindex', '-1');
            this.dom.languageOptions.appendChild(li);
        });
        this.updateSelectedLanguageUI();
    }

    toggleLanguageDropdown() {
        this.dom.languageSelector.classList.toggle('open');
        const isOpen = this.dom.languageSelector.classList.contains('open');
        this.dom.languageBtn.setAttribute('aria-expanded', isOpen);
        if (isOpen) this.dom.languageSearch.focus();
    }

    closeLanguageDropdown() {
        this.dom.languageSelector.classList.remove('open');
        this.dom.languageBtn.setAttribute('aria-expanded', 'false');
    }

    selectLanguage(langCode) {
        this.selectedLanguage = langCode;
        this.updateSelectedLanguageUI();
        this.updateUILanguage(langCode);
        this.closeLanguageDropdown();
    }

    updateSelectedLanguageUI() {
        const selectedLang = ShikshaSaathiUtils.LANGUAGES.find(l => l.code === this.selectedLanguage);
        this.dom.languageText.textContent = selectedLang.name;
        
        this.dom.languageOptions.querySelectorAll('.language-option').forEach(opt => {
            opt.setAttribute('aria-selected', opt.dataset.lang === this.selectedLanguage);
        });
    }

    updateUILanguage(languageCode) {
        const t = ShikshaSaathiUtils.TRANSLATIONS[languageCode] || ShikshaSaathiUtils.TRANSLATIONS.en;
        
        // Update bot name
        const botNameElement = document.querySelector('.bot-title .bot-name');
        const nameLines = botNameElement.querySelectorAll('.bot-name-line');
        const titleParts = t.headerTitle.split(' ');
        
        if (nameLines.length >= 2 && titleParts.length >= 2) {
            nameLines[0].textContent = titleParts[0];
            nameLines[1].textContent = titleParts.slice(1).join(' ');
        } else if (nameLines.length > 0) {
            nameLines[0].textContent = t.headerTitle;
            if (nameLines.length > 1) nameLines[1].textContent = '';
        } else {
            botNameElement.textContent = t.headerTitle;
        }

        // Update welcome message (only if it exists)
        const welcomeTitle = document.querySelector('.welcome-message h2');
        const welcomeDesc = document.querySelector('.welcome-message p');
        if (welcomeTitle) welcomeTitle.textContent = t.welcomeTitle;
        if (welcomeDesc) welcomeDesc.textContent = t.welcomeDesc;
        this.dom.messageInput.dataset.placeholder = t.inputPlaceholder;

        // Update suggestions (only if welcome screen exists)
        if (this.dom.welcomeScreen && !this.welcomeDismissed) {
            const suggestions = this.dom.welcomeScreen.querySelectorAll('.suggestion-chip');
            const suggestionKeys = Object.keys(t.suggestions);
            suggestions.forEach((chip, i) => {
            if (suggestionKeys[i]) {
                const key = suggestionKeys[i];
                chip.textContent = t.suggestions[key];
                chip.dataset.suggestion = t.suggestions[key];
            }
        });
        }
    }

    filterLanguages(term) {
        term = term.toLowerCase();
        ShikshaSaathiUtils.LANGUAGES.forEach(lang => {
            const option = this.dom.languageOptions.querySelector(`[data-lang="${lang.code}"]`);
            const isVisible = lang.name.toLowerCase().includes(term) || lang.native.toLowerCase().includes(term);
            option.style.display = isVisible ? 'block' : 'none';
        });
    }

    // Utility Methods
    scrollToBottom() {
        const el = this.dom.chatMessages;
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }

    scrollToBottomIfAtBottom() {
        const el = this.dom.chatMessages;
        const isAtBottom = (el.scrollHeight - el.scrollTop - el.clientHeight) < 50;
        if (isAtBottom) {
            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        }
    }

    handleSendButtonState() {
        const hasText = this.dom.messageInput.textContent.trim().length > 0;
        this.dom.sendBtn.disabled = !hasText || this.isWaitingForResponse;
        
        // Fix for placeholder not reappearing
        if (!hasText) {
            // Clear content to ensure placeholder shows. Browsers might leave <br> tags.
            this.dom.messageInput.innerHTML = '';
        }
    }

    handleInputResize() {
        const input = this.dom.messageInput;
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    }

    handleViewportResize() {
        const currentHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const isKeyboardVisible = currentHeight < window.innerHeight * 0.8;
        
        if (isKeyboardVisible) {
            document.documentElement.style.setProperty('--keyboard-visible', '1');
            setTimeout(() => this.scrollToBottom(), 100);
        } else {
            document.documentElement.style.setProperty('--keyboard-visible', '0');
        }
    }

    handleMobileKeyboard() {
        const scrollAttempts = [150, 300, 500];
        scrollAttempts.forEach((delay, index) => {
            setTimeout(() => {
                this.scrollToBottom();
                if (/iPad|iPhone|iPod/.test(navigator.userAgent) && index === scrollAttempts.length - 1) {
                    this.scrollToBottom();
                }
            }, delay);
        });
    }

    animateThemeButton() {
        this.dom.themeModeBtn.style.animation = 'wiggle 0.5s ease-in-out';
        this.dom.themeModeBtn.addEventListener('animationend', () => {
            this.dom.themeModeBtn.style.animation = '';
        }, { once: true });
    }

    handleGlobalError(event) {
        if (event.target.tagName === 'IMG') return;
        console.error('Global error caught:', event);
        this.showNotification('Something went wrong. Please try again.', 'error');
    }

    // Notification System
    showNotification(message, type = 'info') {
        document.querySelectorAll('.notification').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message"></span>
                <button class="notification-close" aria-label="Close notification">&times;</button>
            </div>
        `;
        
        notification.querySelector('.notification-message').textContent = message;
        document.body.appendChild(notification);
        
        requestAnimationFrame(() => {
            notification.classList.add('is-visible');
        });
        
        const hideTimeout = setTimeout(() => this.hideNotification(notification), 5000);
        notification.querySelector('.notification-close').addEventListener('click', () => {
            clearTimeout(hideTimeout);
            this.hideNotification(notification);
        });
    }

    hideNotification(notification) {
        notification.classList.remove('is-visible');
        notification.addEventListener('transitionend', () => notification.remove(), { once: true });
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize utilities first
    ShikshaSaathiUtils.initViewportHandling();
    ShikshaSaathiUtils.initAssetHandling();
    
    // Initialize the main chatbot
    new ShikshaSaathiChatbot();
});