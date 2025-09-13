/**
 * Siksha Saathi Widget - JavaScript functionality for embeddable chatbot
 * Provides core chat functionality and postMessage integration
 */

const backendUrl = "https://shiksha-saathi-backend.vercel.app";

class SikshaSathiWidget {
    constructor() {
        this.isEmbedded = this.detectEmbedMode();
        this.isOpen = true;
        this.isWaitingForResponse = false;
        this.currentTheme = 'dark';
        this.selectedLanguage = 'en';
        this.welcomeMessageDismissed = false;

        this.languages = [
            { code: 'en', name: 'English', native: 'English' },
            { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
            { code: 'bn', name: 'Bengali', native: 'বাংলা' },
            { code: 'raj', name: 'Rajasthani', native: 'राजστάની' },
            { code: 'hr', name: 'Haryanvi', native: 'हरियाणवी' },
            { code: 'ta', name: 'Tamil', native: 'தமிழ்' }
        ];

        this.initializeElements();
        this.populateLanguageOptions();
        this.setupEventListeners();
        this.setupEmbedCommunication();
        this.initializeTheme();
        this.updateUILanguage(this.selectedLanguage);

        if (this.isEmbedded) {
            this.notifyParent('widget-ready', { type: 'iframe-ready' });
        }

        console.log('Siksha Saathi Widget initialized', {
            isEmbedded: this.isEmbedded,
            version: '1.2.0' // Version updated for new changes
        });
    }

    detectEmbedMode() {
        try {
            const inIframe = window.self !== window.top;
            const urlParams = new URLSearchParams(window.location.search);
            const embedParam = urlParams.get('embed') === '1';
            return inIframe || embedParam;
        } catch (e) {
            return false; // Fallback for environments with strict cross-origin policies
        }
    }

    initializeElements() {
        this.chatContainer = document.querySelector('.widget-chatbot-container');
        if (!this.chatContainer) {
            console.error("Chat widget container not found.");
            return;
        }
        this.messagesContainer = this.chatContainer.querySelector('#chatMessages');
        this.sendBtn = this.chatContainer.querySelector('#sendBtn');
        this.themeModeBtn = this.chatContainer.querySelector('#themeModeBtn');
        this.languageSelector = this.chatContainer.querySelector('#languageSelector');
        this.languageBtn = this.chatContainer.querySelector('#languageBtn');
        this.languageDropdown = this.chatContainer.querySelector('#languageDropdown');
        this.languageSearch = this.chatContainer.querySelector('#languageSearch');
        this.languageOptions = this.chatContainer.querySelector('#languageOptions');
        this.suggestionChips = this.chatContainer.querySelectorAll('.suggestion-chip');
        this.overlayInput = this.chatContainer.querySelector('#overlayInput');
    }

    setupEventListeners() {
        if (this.sendBtn && this.overlayInput) {
            this.sendBtn.addEventListener('click', () => this.handleSendMessage());
            this.updateSendBtnState();
        }

        if (this.overlayInput) this.setupContentEditableInput();
        if (this.languageSelector) this.setupLanguageSelector();
        
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
                    this.overlayInput.textContent = text;
                    this.handleSendMessage();
                }
            });
        });

        window.addEventListener('resize', () => this.notifyHeightChange());
        if ('visualViewport' in window) {
            window.visualViewport.addEventListener('resize', () => this.handleMobileViewportChange());
        }
    }

    setupContentEditableInput() {
        const debouncedInputHandler = this.debounce(() => {
            this.updateSendBtnState();
            this.notifyHeightChange();
        }, 50);
        this.overlayInput.addEventListener('input', debouncedInputHandler);

        this.overlayInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage();
            }
        });

        this.overlayInput.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text/plain');
            document.execCommand('insertText', false, text);
        });
    }

    populateLanguageOptions() {
        if (!this.languageOptions) return;
        this.languageOptions.innerHTML = ''; // Clear existing options
        this.languages.forEach(lang => {
            const option = document.createElement('li');
            option.className = 'language-option';
            option.dataset.lang = lang.code;
            option.dataset.native = lang.native;
            option.dataset.english = lang.name;
            option.setAttribute('role', 'option');
            option.setAttribute('tabindex', '-1');
            option.setAttribute('aria-selected', lang.code === this.selectedLanguage);
            
            const textSpan = document.createElement('span');
            textSpan.className = 'option-text';
            textSpan.textContent = lang.native;
            option.appendChild(textSpan);
            
            this.languageOptions.appendChild(option);
        });
    }

    setupLanguageSelector() {
        this.languageBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleLanguageDropdown();
        });

        document.addEventListener('click', (e) => {
            if (!this.languageSelector.contains(e.target)) {
                this.closeLanguageDropdown();
            }
        });

        this.languageOptions.addEventListener('click', (e) => {
            const option = e.target.closest('.language-option');
            if (option) {
                this.selectLanguage(option.dataset.lang, option.dataset.native);
            }
        });

        this.languageSearch.addEventListener('input', (e) => this.filterLanguages(e.target.value));
        this.languageSearch.addEventListener('keydown', (e) => e.stopPropagation());

        this.languageSelector.addEventListener('keydown', (e) => this.handleLanguageKeyboardNav(e));
    }

    handleLanguageKeyboardNav(e) {
        const isOpen = this.languageSelector.classList.contains('open');
        if (e.key === 'Escape' && isOpen) {
            this.closeLanguageDropdown();
            this.languageBtn.focus();
        } else if (e.key === ' ' || e.key === 'Enter') {
            if (document.activeElement === this.languageBtn) {
                e.preventDefault();
                this.toggleLanguageDropdown();
            } else if (document.activeElement.classList.contains('language-option')) {
                e.preventDefault();
                const option = document.activeElement;
                this.selectLanguage(option.dataset.lang, option.dataset.native);
            }
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const options = Array.from(this.languageOptions.querySelectorAll('.language-option:not(.hidden)'));
            if (!options.length) return;
            
            let currentIndex = options.findIndex(opt => opt === document.activeElement);
            
            if (e.key === 'ArrowDown') {
                currentIndex = (currentIndex + 1) % options.length;
            } else {
                currentIndex = (currentIndex - 1 + options.length) % options.length;
            }
            options[currentIndex].focus();
        }
    }
    
    toggleLanguageDropdown() {
        const isOpen = this.languageSelector.classList.contains('open');
        isOpen ? this.closeLanguageDropdown() : this.openLanguageDropdown();
    }

    openLanguageDropdown() {
        this.languageSelector.classList.add('open');
        this.languageBtn.setAttribute('aria-expanded', 'true');
        setTimeout(() => this.languageSearch.focus(), 100);
        this.notifyParent('language-dropdown-opened');
    }

    closeLanguageDropdown() {
        this.languageSelector.classList.remove('open');
        this.languageBtn.setAttribute('aria-expanded', 'false');
        if (this.languageSearch) {
            this.languageSearch.value = '';
            this.filterLanguages('');
        }
        this.notifyParent('language-dropdown-closed');
    }

    selectLanguage(code, nativeName) {
        this.selectedLanguage = code;
        
        const textSpan = this.languageBtn.querySelector('.language-text');
        if (textSpan) textSpan.textContent = nativeName;

        this.languageOptions.querySelectorAll('.language-option').forEach(option => {
            option.setAttribute('aria-selected', option.dataset.lang === code);
        });

        this.updateUILanguage(code);
        this.closeLanguageDropdown();
        this.languageBtn.focus();
        this.notifyParent('language-changed', { language: code, nativeName });
        console.log('Language changed to:', { code, nativeName });
    }

    updateUILanguage(languageCode) {
        const translations = {
            en: { headerTitle: "Shiksha Saathi", searchPlaceholder: "Search languages...", welcomeTitle: "Welcome to Shiksha Saathi", welcomeDesc: "Your AI-powered learning assistant. Ask me anything!", inputPlaceholder: "Type your query...", suggestions: { whoAreYou: "Who are you?", whoMaintains: "Who maintains you?", whatCanYouDo: "What can you do?" } },
            hi: { headerTitle: "शिक्षा साथी", searchPlaceholder: "भाषाएं खोजें...", welcomeTitle: "शिक्षा साथी में आपका स्वागत है", welcomeDesc: "आपका AI-संचालित शिक्षण सहायक। मुझसे कुछ भी पूछें!", inputPlaceholder: "अपना प्रश्न लिखें...", suggestions: { whoAreYou: "आप कौन हैं?", whoMaintains: "आपको कौन संचालित करता है?", whatCanYouDo: "आप क्या कर सकते हैं?" } },
            bn: { headerTitle: "শিক্ষা সাথী", searchPlaceholder: "ভাষা খুঁজুন...", welcomeTitle: "শিক্ষা সাথীতে স্বাগতম", welcomeDesc: "আপনার AI-চালিত শিক্ষা সহায়ক। আমাকে যেকোনো কিছু জিজ্ঞাসা করুন!", inputPlaceholder: "আপনার প্রশ্ন লিখুন...", suggestions: { whoAreYou: "আপনি কে?", whoMaintains: "আপনাকে কে রক্ষণাবেক্ষণ করে?", whatCanYouDo: "আপনি কী করতে পারেন?" } },
            raj: { headerTitle: "शिक्षा साथी", searchPlaceholder: "भाषावां खोजो...", welcomeTitle: "शिक्षा साथी में आपनो स्वागत है", welcomeDesc: "आपनो AI-चालित शिक्षा साथी। म्हारै सूं कुछ भी पूछो!", inputPlaceholder: "आपनो सवाल लिखो...", suggestions: { whoAreYou: "थे कुण सो?", whoMaintains: "थमनै कुण चलावै?", whatCanYouDo: "थे के कर सको?" } },
            hr: { headerTitle: "शिक्षा साथी", searchPlaceholder: "भाषाएं खोजें...", welcomeTitle: "शिक्षा साथी में आपका स्वागत है", welcomeDesc: "आपका AI-चालित शिक्षा साथी। म्हारै तै कुछ भी पूछो!", inputPlaceholder: "अपना सवाल लिखो...", suggestions: { whoAreYou: "तू कौण सै?", whoMaintains: "तेरै न कौण चलावै सै?", whatCanYouDo: "तू के कर सकै सै?" } },
            ta: { headerTitle: "ஷிக்ஷா சாத்தி", searchPlaceholder: "மொழிகளைத் தேடுங்கள்...", welcomeTitle: "ஷிக்ஷா சாத்திக்கு வரவேற்கிறோம்", welcomeDesc: "உங்கள் AI-இயங்கும் கற்றல் உதவியாளர். என்னிடம் எதையும் கேளுங்கள்!", inputPlaceholder: "உங்கள் கேள்வியை டைப் செய்யுங்கள்...", suggestions: { whoAreYou: "நீங்கள் யார்?", whoMaintains: "உங்களை யார் பராமரிக்கிறார்கள்?", whatCanYouDo: "நீங்கள் என்ன செய்ய முடியும்?" } }
        };

        const lang = translations[languageCode] || translations.en;
        
        const titleLines = document.querySelectorAll('.title-stack .title-line');
        if (titleLines.length >= 2) {
            const [part1, part2] = lang.headerTitle.split(' ');
            titleLines[0].textContent = part1 || 'Shiksha';
            titleLines[1].textContent = part2 || 'Saathi';
        }

        if (this.languageSearch) this.languageSearch.placeholder = lang.searchPlaceholder;
        const welcomeTitle = document.querySelector('.welcome-message h2');
        if (welcomeTitle) welcomeTitle.textContent = lang.welcomeTitle;
        const welcomeDesc = document.querySelector('.welcome-message p');
        if (welcomeDesc) welcomeDesc.textContent = lang.welcomeDesc;
        if (this.overlayInput) this.overlayInput.setAttribute('data-placeholder', lang.inputPlaceholder);

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
        const term = searchTerm.toLowerCase().trim();
        this.languageOptions.querySelectorAll('.language-option').forEach(option => {
            const nativeText = option.dataset.native.toLowerCase();
            const englishName = option.dataset.english.toLowerCase();
            const matches = nativeText.includes(term) || englishName.includes(term);
            option.classList.toggle('hidden', !matches);
        });
    }

    setupEmbedCommunication() {
        if (!this.isEmbedded) return;
        window.addEventListener('message', (event) => {
            if (!event.data || typeof event.data !== 'object' || !event.data.type) return;
            switch (event.data.type) {
                case 'set-theme': this.setTheme(event.data.theme); break;
            }
        });
    }
    
    notifyParent(type, data = {}) {
        if (!this.isEmbedded) return;
        try {
            const message = { type, source: 'siksha-sathi-widget', ...data };
            window.parent.postMessage(message, '*');
        } catch (error) {
            console.error("Failed to postMessage to parent:", error);
        }
    }
    
    notifyHeightChange() {
        if (!this.isEmbedded) return;
        const height = Math.max(document.body.scrollHeight, 400);
        this.notifyParent('height-changed', { height });
    }
    
    handleMobileViewportChange() {
        if (this.overlayInput && document.activeElement === this.overlayInput) {
            setTimeout(() => this.overlayInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
        }
    }
    
    handleSendMessage() {
        const message = this.overlayInput.textContent.trim();
        if (!message || this.isWaitingForResponse) return;
        
        this.isWaitingForResponse = true;
        this.updateSendBtnState();
        this.addMessage(message, 'user');
        this.overlayInput.textContent = '';
        this.showTypingIndicator();
        this.getBotResponse(message);
        this.notifyParent('message-sent', { message });
    }
    
    async addMessage(content, sender = 'bot', enableStreaming = false) {
        if (!this.welcomeMessageDismissed) {
            const welcomeMessage = this.messagesContainer.querySelector('.welcome-message');
            if (welcomeMessage) welcomeMessage.style.display = 'none';
            this.welcomeMessageDismissed = true;
        }

        const messageElement = document.createElement('div');
        if (sender === 'user') {
            messageElement.className = 'message user';
            messageElement.innerHTML = `<div class="message-content"><div class="message-text"></div></div>`;
            messageElement.querySelector('.message-text').textContent = content;
        } else {
            messageElement.className = 'bot-response';
            messageElement.innerHTML = `<div class="bot-response-content"></div>`;
            const contentDiv = messageElement.querySelector('.bot-response-content');
            
            this.messagesContainer.appendChild(messageElement);
            this.scrollToBottom();

            if (enableStreaming) {
                await this.streamBotResponse(content, contentDiv, messageElement);
            } else {
                contentDiv.innerHTML = this.renderMarkdown(content);
                this.addCodeCopyButtons(messageElement);
            }
            return messageElement;
        }
        this.messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
        return messageElement;
    }

    streamBotResponse(content, contentDiv, botElement) {
        return new Promise(resolve => {
            const chars = Array.from(content);
            let currentText = '';
            let index = 0;
            const charsPerFrame = 3; // Increase this value for faster typing

            const type = () => {
                if (index < chars.length) {
                    const chunk = chars.slice(index, index + charsPerFrame).join('');
                    currentText += chunk;
                    index += charsPerFrame;
                    contentDiv.innerHTML = this.renderMarkdown(currentText);
                    this.scrollToBottom();
                    requestAnimationFrame(type);
                } else {
                    this.addCodeCopyButtons(botElement);
                    this.notifyHeightChange();
                    resolve(); // Resolve the promise when typing is finished
                }
            };
            type();
        });
    }

    renderMarkdown(content) {
        if (typeof marked === 'undefined') {
            const div = document.createElement('div');
            div.textContent = content;
            return div.innerHTML;
        }
        try {
            marked.setOptions({ breaks: true, gfm: true });
            return this.sanitizeHtml(marked.parse(content));
        } catch (error) {
            console.error('Markdown rendering failed:', error);
            const div = document.createElement('div');
            div.textContent = content;
            return div.innerHTML;
        }
    }

    sanitizeHtml(html) {
        return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                   .replace(/on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    }

    addCodeCopyButtons(messageElement) {
        messageElement.querySelectorAll('pre').forEach(pre => {
            if (pre.parentElement.classList.contains('code-block-container')) return;
            const code = pre.querySelector('code');
            if (!code) return;

            const container = document.createElement('div');
            container.className = 'code-block-container';
            pre.replaceWith(container);
            container.appendChild(pre);

            const button = document.createElement('button');
            button.className = 'code-copy-btn';
            button.textContent = 'Copy';
            container.appendChild(button);
            button.addEventListener('click', () => this.copyCodeToClipboard(code.innerText, button));
        });
    }

    async copyCodeToClipboard(code, button) {
        if (!navigator.clipboard) return;
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
                body: JSON.stringify({ message: userMessage, language: this.selectedLanguage })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            this.hideTypingIndicator();
            // Await the addMessage function to ensure streaming is complete
            await this.addMessage(data.reply, 'bot', true);

        } catch (error) {
            console.error('Failed to get response from backend:', error);
            this.hideTypingIndicator();
            await this.addMessage("I'm having trouble connecting right now. Please try again in a moment.", 'bot');
        } finally {
            // This now correctly waits until the streaming is finished
            this.isWaitingForResponse = false;
            this.updateSendBtnState();
            if (this.overlayInput) this.overlayInput.focus();
            this.notifyHeightChange();
        }
    }
    
    scrollToBottom() {
        if (!this.messagesContainer) return;
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
    
    updateSendBtnState() {
        if (!this.sendBtn || !this.overlayInput) return;
        const hasContent = this.overlayInput.textContent.trim().length > 0;
        this.sendBtn.disabled = !hasContent || this.isWaitingForResponse;
    }
    
    initializeTheme() {
        try {
            const savedTheme = localStorage.getItem('siksha-sathi-theme');
            const theme = savedTheme === 'light' ? 'light' : 'dark';
            this.setTheme(theme, true);
        } catch (error) {
            console.warn('Could not access localStorage to initialize theme.', error);
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
                console.warn('Could not access localStorage to save theme preference.', error);
            }
        }

        if (this.themeModeBtn) {
            this.themeModeBtn.classList.toggle('sun-active', theme === 'light');
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