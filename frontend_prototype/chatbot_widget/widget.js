/**
 * Siksha Sathi Widget - JavaScript functionality for embeddable chatbot
 * Provides core chat functionality and postMessage     setupLanguageSelector() {
        if (!this.languageSelector || !this.languageBtn || !this.languageDropdown) return;

        this.languages = [
            { code: 'en', name: 'English', native: 'English' },
            { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
            { code: 'bn', name: 'Bengali', native: 'বাংলা' },
            { code: 'raj', name: 'Rajasthani', native: 'राजस्थानी' },
            { code: 'hr', name: 'Haryanvi', native: 'हरियाणवी' },
            { code: 'ta', name: 'Tamil', native: 'தமிழ்' }
        ];me integration
 */

const backendUrl = "https://shiksha-saathi-backend.vercel.app";

class SikshaSathiWidget {
    constructor() {
        this.isEmbedded = this.detectEmbedMode();
        this.isOpen = true;
        this.isWaitingForResponse = false;
        this.currentTheme = 'dark'; // Initialize theme
        this.selectedLanguage = 'en'; // Initialize language
        this.welcomeMessageDismissed = false;

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
        if (!this.chatContainer) {
            console.error("Chat widget container not found.");
            return;
        }
        this.messagesContainer = this.chatContainer.querySelector('.chat-messages');
        this.sendBtn = this.chatContainer.querySelector('#sendBtn');
        this.headerTitle = this.chatContainer.querySelector('.header-title h1');
        this.themeModeBtn = this.chatContainer.querySelector('#themeModeBtn');
        this.languageSelector = this.chatContainer.querySelector('#languageSelector');
        this.languageBtn = this.chatContainer.querySelector('#languageBtn');
        this.languageDropdown = this.chatContainer.querySelector('#languageDropdown');
        this.languageSearch = this.chatContainer.querySelector('#languageSearch');
        this.languageOptions = this.chatContainer.querySelector('#languageOptions');
        this.suggestionChips = this.chatContainer.querySelectorAll('.suggestion-chip');
        this.overlayInput = this.chatContainer.querySelector('#overlayInput');

        if (this.sendBtn && this.overlayInput) {
            this.sendBtn.addEventListener('click', () => {
                if (!this.isWaitingForResponse && !this.sendBtn.disabled) {
                    this.handleSendMessage();
                }
            });

            // The <button> element handles keyboard activation automatically.
            // No extra keydown listener is needed for it.
            this.updateSendBtnState();
        }

        if (this.overlayInput) this.setupContentEditableInput();
        if (this.languageSelector) this.setupLanguageSelector();
        
        // Initialize UI with default language
        this.updateUILanguage(this.selectedLanguage || 'en');
        
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
        
        this.overlayInput.addEventListener('focus', () => {
            setTimeout(() => this.handleMobileViewportChange(), 300);
        });
        
        this.overlayInput.addEventListener('blur', () => {
            if ('visualViewport' in window && this.chatContainer) {
                this.chatContainer.style.height = '';
            }
        });
    }

    // Setup language selector dropdown functionality
    setupLanguageSelector() {
        if (!this.languageSelector || !this.languageBtn || !this.languageDropdown) return;

        this.selectedLanguage = 'en';
        this.languages = [
            { code: 'en', name: 'English', native: 'English' },
            { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
            { code: 'bn', name: 'Bengali', native: 'বাংলা' },
            { code: 'raj', name: 'Rajasthani', native: 'राजस्थानी' },
            { code: 'hr', name: 'Haryanvi', native: 'हरियाणवी' },
            { code: 'ta', name: 'Tamil', native: 'தமிழ்' }
        ];

        // Toggle dropdown
        this.languageBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleLanguageDropdown();
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.languageSelector.contains(e.target)) {
                this.closeLanguageDropdown();
            }
        });

        // Reposition dropdown on window resize
        window.addEventListener('resize', () => {
            if (this.languageSelector.classList.contains('open')) {
                this.adjustDropdownPosition();
            }
        });

        // Handle language option selection
        if (this.languageOptions) {
            this.languageOptions.addEventListener('click', (e) => {
                const option = e.target.closest('.language-option');
                if (option) {
                    const langCode = option.dataset.lang;
                    const langNative = option.dataset.native;
                    this.selectLanguage(langCode, langNative);
                }
            });
        }

        // Handle search functionality
        if (this.languageSearch) {
            this.languageSearch.addEventListener('input', (e) => {
                this.filterLanguages(e.target.value);
            });

            this.languageSearch.addEventListener('keydown', (e) => {
                e.stopPropagation();
            });
        }

        // Keyboard navigation
        this.languageBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggleLanguageDropdown();
            } else if (e.key === 'Escape') {
                this.closeLanguageDropdown();
            }
        });
    }

    toggleLanguageDropdown() {
        const isOpen = this.languageSelector.classList.contains('open');
        if (isOpen) {
            this.closeLanguageDropdown();
        } else {
            this.openLanguageDropdown();
        }
    }

    openLanguageDropdown() {
        this.languageSelector.classList.add('open');
        
        // Adjust dropdown position to prevent overflow
        this.adjustDropdownPosition();
        
        if (this.languageSearch) {
            setTimeout(() => this.languageSearch.focus(), 100);
        }
        this.notifyParent('language-dropdown-opened');
    }

    adjustDropdownPosition() {
        if (!this.languageDropdown) return;
        
        // Reset position first
        this.languageDropdown.style.left = '';
        this.languageDropdown.style.right = '';
        this.languageDropdown.style.transform = '';
        
        // Get element positions
        const dropdown = this.languageDropdown;
        const selector = this.languageSelector;
        const selectorRect = selector.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const dropdownWidth = 200; // min-width from CSS
        const padding = 16; // Padding from viewport edge
        
        // Calculate if dropdown would overflow on the right
        const rightEdge = selectorRect.right;
        const wouldOverflowRight = rightEdge + dropdownWidth > viewportWidth - padding;
        
        // Calculate if dropdown would overflow on the left  
        const leftEdge = selectorRect.left;
        const wouldOverflowLeft = leftEdge - dropdownWidth < padding;
        
        if (wouldOverflowRight && !wouldOverflowLeft) {
            // Position dropdown to the left of the button
            dropdown.style.right = '0';
            dropdown.style.left = 'auto';
        } else if (wouldOverflowLeft && !wouldOverflowRight) {
            // Position dropdown to the right of the button
            dropdown.style.left = '0';
            dropdown.style.right = 'auto';
        } else if (wouldOverflowRight && wouldOverflowLeft) {
            // Center dropdown with padding from both sides
            const centerOffset = (viewportWidth - dropdownWidth) / 2 - selectorRect.left;
            dropdown.style.left = `${Math.max(padding - selectorRect.left, centerOffset)}px`;
            dropdown.style.right = 'auto';
        } else {
            // Default position (right-aligned)
            dropdown.style.right = '0';
            dropdown.style.left = 'auto';
        }
    }

    closeLanguageDropdown() {
        this.languageSelector.classList.remove('open');
        if (this.languageSearch) {
            this.languageSearch.value = '';
            this.filterLanguages('');
        }
        this.notifyParent('language-dropdown-closed');
    }

    selectLanguage(code, nativeName) {
        this.selectedLanguage = code;
        
        // Update the button display - keep globe emoji, update text
        const textSpan = this.languageBtn.querySelector('.language-text');
        if (textSpan) textSpan.textContent = nativeName;

        // Update selected state in options
        const options = this.languageOptions.querySelectorAll('.language-option');
        options.forEach(option => {
            option.classList.toggle('selected', option.dataset.lang === code);
        });

        // Update UI language
        this.updateUILanguage(code);

        this.closeLanguageDropdown();
        this.notifyParent('language-changed', { language: code, nativeName });
        
        console.log('Language changed to:', { code, nativeName });
    }

    updateUILanguage(languageCode) {
        // Translation strings for UI elements
        const translations = {
            en: {
                headerTitle: "Shiksha Saathi",
                searchPlaceholder: "Search languages...",
                welcomeTitle: "Welcome to Shiksha Saathi",
                welcomeDesc: "Your AI-powered learning assistant. Ask me anything!",
                inputPlaceholder: "Type your query...",
                suggestions: {
                    whoAreYou: "Who are you?",
                    whoMaintains: "Who maintains you?", 
                    whatCanYouDo: "What can you do?"
                }
            },
            hi: {
                headerTitle: "शिक्षा साथी",
                searchPlaceholder: "भाषाएं खोजें...",
                welcomeTitle: "शिक्षा साथी में आपका स्वागत है",
                welcomeDesc: "आपका AI-संचालित शिक्षण सहायक। मुझसे कुछ भी पूछें!",
                inputPlaceholder: "अपना प्रश्न लिखें...",
                suggestions: {
                    whoAreYou: "आप कौन हैं?",
                    whoMaintains: "आपको कौन संचालित करता है?",
                    whatCanYouDo: "आप क्या कर सकते हैं?"
                }
            },
            bn: {
                headerTitle: "শিক্ষা সাথী",
                searchPlaceholder: "ভাষা খুঁজুন...",
                welcomeTitle: "শিক্ষা সাথীতে স্বাগতম",
                welcomeDesc: "আপনার AI-চালিত শিক্ষা সহায়ক। আমাকে যেকোনো কিছু জিজ্ঞাসা করুন!",
                inputPlaceholder: "আপনার প্রশ্ন লিখুন...",
                suggestions: {
                    whoAreYou: "আপনি কে?",
                    whoMaintains: "আপনাকে কে রক্ষণাবেক্ষণ করে?",
                    whatCanYouDo: "আপনি কী করতে পারেন?"
                }
            },
            raj: {
                headerTitle: "शिक्षा साथी",
                searchPlaceholder: "भाषावां खोजो...",
                welcomeTitle: "शिक्षा साथी में आपनो स्वागत है",
                welcomeDesc: "आपनो AI-चालित शिक्षा साथी। म्हारै सूं कुछ भी पूछो!",
                inputPlaceholder: "आपनो सवाल लिखो...",
                suggestions: {
                    whoAreYou: "थे कुण सो?",
                    whoMaintains: "थमनै कुण चलावै?",
                    whatCanYouDo: "थे के कर सको?"
                }
            },
            hr: {
                headerTitle: "शिक्षा साथी",
                searchPlaceholder: "भाषाएं खोजें...",
                welcomeTitle: "शिक्षा साथी में आपका स्वागत है",
                welcomeDesc: "आपका AI-चालित शिक्षा साथी। म्हारै तै कुछ भी पूछो!",
                inputPlaceholder: "अपना सवाल लिखो...",
                suggestions: {
                    whoAreYou: "तू कौण सै?",
                    whoMaintains: "तेरै न कौण चलावै सै?",
                    whatCanYouDo: "तू के कर सकै सै?"
                }
            },
            ta: {
                headerTitle: "ஷிக்ஷா சாத்தி",
                searchPlaceholder: "மொழிகளைத் தேடுங்கள்...",
                welcomeTitle: "ஷிக்ஷா சாத்திக்கு வரவேற்கிறோம்",
                welcomeDesc: "உங்கள் AI-இயங்கும் கற்றல் உதவியாளர். என்னிடம் எதையும் கேளுங்கள்!",
                inputPlaceholder: "உங்கள் கேள்வியை டைப் செய்யுங்கள்...",
                suggestions: {
                    whoAreYou: "நீங்கள் யார்?",
                    whoMaintains: "உங்களை யார் பராமரிக்கிறார்கள்?",
                    whatCanYouDo: "நீங்கள் என்ன செய்ய முடியும்?"
                }
            }
        };

        const lang = translations[languageCode] || translations.en;

        // Update header title
        const titleLines = document.querySelectorAll('.title-stack .title-line');
        if (titleLines.length >= 2) {
            const headerParts = lang.headerTitle.split(' ');
            titleLines[0].textContent = headerParts[0] || 'Shiksha';
            titleLines[1].textContent = headerParts[1] || 'Saathi';
        }

        // Update search placeholder
        if (this.languageSearch) {
            this.languageSearch.placeholder = lang.searchPlaceholder;
        }

        // Update welcome message
        const welcomeTitle = document.querySelector('.welcome-message h2');
        const welcomeDesc = document.querySelector('.welcome-message p');
        if (welcomeTitle) welcomeTitle.textContent = lang.welcomeTitle;
        if (welcomeDesc) welcomeDesc.textContent = lang.welcomeDesc;

        // Update input placeholder
        if (this.overlayInput) {
            this.overlayInput.setAttribute('data-placeholder', lang.inputPlaceholder);
        }

        // Update suggestion chips
        const suggestions = document.querySelectorAll('.suggestion-chip');
        suggestions.forEach((chip, index) => {
            const suggestionKeys = Object.keys(lang.suggestions);
            if (index < suggestionKeys.length) {
                const key = suggestionKeys[index];
                chip.textContent = lang.suggestions[key];
                chip.setAttribute('data-suggestion', lang.suggestions[key]);
            }
        });
    }

    filterLanguages(searchTerm) {
        if (!this.languageOptions) return;
        
        const options = this.languageOptions.querySelectorAll('.language-option');
        const term = searchTerm.toLowerCase().trim();
        
        options.forEach(option => {
            const nativeText = option.querySelector('.option-text').textContent.toLowerCase();
            const englishName = option.getAttribute('data-english')?.toLowerCase() || '';
            
            // Match either native name or English name
            const matches = nativeText.includes(term) || englishName.includes(term);
            option.classList.toggle('hidden', !matches);
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
    
    notifyHeightChange() {
        if (!this.isEmbedded) return;
        const height = Math.max(this.chatContainer.scrollHeight, 400);
        this.notifyParent('height-changed', { height });
    }
    
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
        this.getBotResponse(message);
        this.notifyParent('message-sent', { message });
        this.notifyHeightChange();
    }
    
    addMessage(content, sender = 'bot', enableStreaming = false) {
        if (!this.welcomeMessageDismissed) {
            const welcomeMessage = this.messagesContainer.querySelector('.welcome-message');
            if (welcomeMessage) {
                welcomeMessage.style.display = 'none';
            }
            this.welcomeMessageDismissed = true;
        }

        if (sender === 'user') {
            const processedContent = this.escapeHtml(content);
            const messageElement = document.createElement('div');
            messageElement.className = `message user`;
            messageElement.innerHTML = `
                <div class="message-content">
                    <div class="message-text">${processedContent}</div>
                </div>
            `;
            this.messagesContainer.appendChild(messageElement);
            this.scrollToBottom();
            return messageElement;
        } else {
            const botElement = document.createElement('div');
            botElement.className = 'bot-response';
            botElement.innerHTML = `<div class="bot-response-content"></div>`;
            this.messagesContainer.appendChild(botElement);
            const contentDiv = botElement.querySelector('.bot-response-content');

            if (enableStreaming) {
                this.streamBotResponse(content, contentDiv, botElement);
            } else {
                const processedContent = this.renderMarkdown(content);
                contentDiv.innerHTML = processedContent;
                this.addCodeCopyButtons(botElement);
            }
            this.scrollToBottom();
            return botElement;
        }
    }

    streamBotResponse(content, contentDiv, botElement) {
        const chars = content.split('');
        let currentIndex = 0;
        let currentText = '';
        
        const typeChar = () => {
            if (currentIndex < chars.length) {
                currentText += chars[currentIndex];
                currentIndex++;
                contentDiv.innerHTML = this.renderMarkdown(currentText);
                this.scrollToBottom();
                setTimeout(typeChar, 1); // Adjust speed here
            } else {
                this.addCodeCopyButtons(botElement);
            }
        };
        typeChar();
    }

    renderMarkdown(content) {
        if (typeof marked === 'undefined') {
            return this.escapeHtml(content);
        }
        try {
            marked.setOptions({ breaks: true, gfm: true, sanitize: false });
            return this.sanitizeHtml(marked.parse(content));
        } catch (error) {
            console.error('Markdown rendering failed:', error);
            return this.escapeHtml(content);
        }
    }

    sanitizeHtml(html) {
        return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>|on\w+\s*=\s*"[^"]*"|on\w+\s*=\s*'[^']*'|javascript:/gi, '');
    }

    addCodeCopyButtons(messageElement) {
        const codeBlocks = messageElement.querySelectorAll('pre');
        codeBlocks.forEach(pre => {
            if (pre.querySelector('.code-copy-btn')) return;
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
            setTimeout(() => { button.textContent = 'Copy'; }, 2000);
        }
    }

    showTypingIndicator() {
        if (this.messagesContainer.querySelector('.typing-indicator')) return;
        const typingDots = document.createElement('div');
        typingDots.className = 'typing-indicator';
        typingDots.innerHTML = '<span></span><span></span><span></span>';
        this.messagesContainer.appendChild(typingDots);
        this.scrollToBottom();
    }
    
    hideTypingIndicator() {
        const typingIndicator = this.messagesContainer.querySelector('.typing-indicator');
        if (typingIndicator) typingIndicator.remove();
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
                throw new Error(`HTTP error! status: ${response.status}, details: ${errorData.error || 'Unknown error'}`);
            }

            const data = await response.json();
            this.hideTypingIndicator();
            this.addMessage(data.reply, 'bot', true);

        } catch (error) {
            console.error('Failed to get response from backend:', error);
            this.hideTypingIndicator();
            const fallbackResponse = "I'm having trouble connecting right now. Please try again in a moment.";
            this.addMessage(fallbackResponse, 'bot', true);
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
        this.sendBtn.disabled = !isButtonActive;
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
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        window.sikshaSathiWidget = new SikshaSathiWidget();
    } catch (error) {
        console.error('Failed to initialize Siksha Saathi Widget:', error);
    }
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SikshaSathiWidget;
}