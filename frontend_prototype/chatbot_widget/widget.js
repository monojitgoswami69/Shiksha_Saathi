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
        this.chatHistory = [];
        this.currentChatId = null;
        this.messageCount = 0;
        this.isWaitingForResponse = false;
        this.currentTheme = 'dark'; // Initialize theme
        this.sessionId = null; // For backend session management
    // Configurable synthetic response delay (ms). Set to 0 to disable artificial delay.
    this.simulatedResponseDelay = 0;

        // Initialize widget
    this.initializeTheme();
    this.initializeElements();
    this.setupEventListeners();
    this.setupEmbedCommunication();
    this.loadChatHistory();

    // Notify parent if embedded
        if (this.isEmbedded) {
            this.notifyParent('widget-ready', {
                type: 'iframe-ready',
                timestamp: new Date().toISOString()
            });
        }

        console.log('Siksha Sathi Widget initialized', {
            isEmbedded: this.isEmbedded,
            version: '1.0.0',
            overlayInput: !!this.overlayInput
        });
    }
    
    // Detect embed mode (iframe or URL param)
    detectEmbedMode() {
        const inIframe = window.self !== window.top;
        const urlParams = new URLSearchParams(window.location.search);
        const embedParam = urlParams.get('embed') === '1';
        const openParam = urlParams.get('open') === '1';

        if (openParam) this.isOpen = true;
        return inIframe || embedParam;
    }
    
    // Initialize DOM element references
    initializeElements() {
        this.chatContainer = document.querySelector('.widget-chatbot-container');
        this.messagesContainer = document.querySelector('.chat-messages');
        this.chatInput = null;
        this.sendBtn = document.querySelector('#sendBtn');

        this.headerTitle = document.querySelector('.header-title h1');
        this.themeModeBtn = document.querySelector('#themeModeBtn');
        this.sunIcon = document.querySelector('.theme-mode-icon.sun-icon');
        this.moonIcon = document.querySelector('.theme-mode-icon.moon-icon');

        this.suggestionChips = document.querySelectorAll('.suggestion-chip');
        this.overlayInput = document.querySelector('#overlayInput');

        if (this.sendBtn && this.overlayInput) {
            this.sendBtn.addEventListener('click', () => {
                if (!this.isWaitingForResponse && !this.sendBtn.classList.contains('inactive')) {
                    this.handleSendMessage();
                }
            });
            this.updateSendBtnState();
        }

        if (this.overlayInput) this.setupContentEditableInput();

        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        if (this.themeModeBtn) {
            this.themeModeBtn.classList.remove('sun-active', 'moon-active', 'rotating');
            if (current === 'dark') this.themeModeBtn.classList.add('moon-active');
            else this.themeModeBtn.classList.add('sun-active');
        }
    }
    
    // Setup contenteditable input behavior and handlers
    setupContentEditableInput() {
        if (!this.overlayInput) return;

        let inputTimeout;
        const debouncedInputHandler = () => {
            clearTimeout(inputTimeout);
            inputTimeout = setTimeout(() => {
                this.autoResizeInput();
                this.updateSendBtnState();
                this.updatePlaceholderVisibility();
                this.notifyHeightChange();
            }, 50);
        };

        this.overlayInput.addEventListener('input', debouncedInputHandler);

        this.overlayInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!this.isWaitingForResponse) this.handleSendMessage();
            }
        });

        this.overlayInput.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text');
            if (typeof Selection !== 'undefined' && typeof Range !== 'undefined') {
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    range.deleteContents();
                    range.insertNode(document.createTextNode(text));
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            } else {
                document.execCommand('insertText', false, text);
            }
        });

        this.autoResizeInput();
        
        // Add mobile-specific focus handling for better keyboard behavior
        this.overlayInput.addEventListener('focus', () => {
            // Delay to ensure keyboard is shown
            setTimeout(() => {
                this.handleMobileViewportChange();
            }, 300);
        });
        
        this.overlayInput.addEventListener('blur', () => {
            // Reset container height when keyboard hides
            if ('visualViewport' in window && this.chatContainer) {
                this.chatContainer.style.height = '';
            }
        });
    }
    
    // Register UI event listeners
    setupEventListeners() {
        if (this.themeModeBtn) {
            this.themeModeBtn.addEventListener('click', () => {
                this.themeModeBtn.classList.add('rotating');
                const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
                if (nextTheme === 'dark') {
                    this.themeModeBtn.classList.remove('sun-active');
                    this.themeModeBtn.classList.add('moon-active');
                } else {
                    this.themeModeBtn.classList.remove('moon-active');
                    this.themeModeBtn.classList.add('sun-active');
                }
                this.setTheme(nextTheme);
                setTimeout(() => this.themeModeBtn.classList.remove('rotating'), 520);
            });
        }

        this.suggestionChips.forEach(chip => {
            chip.addEventListener('click', () => {
                if (!this.isWaitingForResponse) {
                    const text = chip.textContent.trim();
                    if (this.overlayInput) this.overlayInput.textContent = text;
                    this.handleSendMessage();
                }
            });
        });

        window.addEventListener('resize', () => this.notifyHeightChange());
        
        // Mobile viewport handling - listen for visual viewport changes
        if ('visualViewport' in window) {
            window.visualViewport.addEventListener('resize', () => {
                this.handleMobileViewportChange();
            });
        }
        
        // Orientation change handling for mobile
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
                    this.notifyParent('status-response', { isOpen: this.isOpen, messageCount: this.messageCount, hasUnread: false });
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
        // Ensure input remains visible when keyboard appears
        if (this.overlayInput && document.activeElement === this.overlayInput) {
            // Small delay to let the keyboard animation finish
            setTimeout(() => {
                this.overlayInput.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'nearest' 
                });
            }, 50);
        }
        
        // Update container height to accommodate keyboard
        if ('visualViewport' in window) {
            const viewportHeight = window.visualViewport.height;
            const containerElement = this.chatContainer;
            if (containerElement && viewportHeight) {
                containerElement.style.height = `${viewportHeight}px`;
            }
        }
    }
    
    handleSendMessage() {
        if (!this.overlayInput) {
            console.error('overlayInput not found in handleSendMessage');
            return;
        }
        
        const message = this.overlayInput.textContent.trim();
        if (!message || this.isWaitingForResponse) {
            console.log('Message empty or waiting for response', { message, isWaiting: this.isWaitingForResponse });
            return;
        }
        
        // Set waiting state; input remains available for the user
        this.isWaitingForResponse = true;
        
        console.log('Sending message:', message);
        
        // Add user message
        this.addMessage(message, 'user');
        
        // Clear input after message is added
        this.overlayInput.textContent = '';
        this.autoResizeInput();
        this.updateSendBtnState();
        this.updatePlaceholderVisibility();
        
        // Show typing indicator immediately
        this.showTypingIndicator();
        
        // Simulate bot response (configurable). If delay is 0, call immediately.
        const delay = Number.isFinite(this.simulatedResponseDelay) ? this.simulatedResponseDelay : 0;
        if (delay > 0) {
            setTimeout(() => this.simulateBotResponse(message), delay);
        } else {
            this.simulateBotResponse(message);
        }
        
        // Notify parent about message sent
        this.notifyParent('message-sent', {
            message: message,
            messageCount: this.messageCount
        });
        
        this.notifyHeightChange();
    }
    
    addMessage(content, sender = 'bot', options = {}) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${sender}`;
        
        const now = new Date();
        const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        let processedContent = sender === 'bot' ? this.renderMarkdown(content) : this.escapeHtml(content);
        
        messageElement.innerHTML = `
            <div class="message-content">${processedContent}</div>
            <div class="message-meta">
                <span class="meta-username">${sender === 'user' ? 'You' : 'Siksha Saathi'}</span>
                <span class="meta-timestamp">${timestamp}</span>
            </div>
        `;
        
        if (sender === 'bot') {
            this.addCodeCopyButtons(messageElement);
        }
        
        const welcomeMessage = this.messagesContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
        
        this.messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
        
        // The history is now managed centrally after backend response,
        // so we don't push individual messages here anymore.
        // This method is now purely for rendering.
        
        return messageElement;
    }

    // Render markdown content with safety measures
    renderMarkdown(content) {
        if (typeof marked === 'undefined') {
            console.warn('Marked library not loaded, falling back to escaped HTML');
            return this.escapeHtml(content);
        }

        try {
            // Configure marked with safe options
            marked.setOptions({
                breaks: true, // Enable line breaks
                gfm: true,    // GitHub Flavored Markdown
                sanitize: false, // We'll handle sanitization manually
                highlight: function(code, lang) {
                    // Simple syntax highlighting placeholder
                    return code;
                }
            });

            // Render markdown to HTML
            let html = marked.parse(content);
            
            // Basic XSS protection - remove dangerous elements
            html = this.sanitizeHtml(html);
            
            return html;
        } catch (error) {
            console.error('Markdown rendering failed:', error);
            return this.escapeHtml(content);
        }
    }

    // Basic HTML sanitization
    sanitizeHtml(html) {
        // Remove script tags and event handlers
        html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        html = html.replace(/on\w+\s*=\s*"[^"]*"/g, '');
        html = html.replace(/on\w+\s*=\s*'[^']*'/g, '');
        html = html.replace(/javascript:/gi, '');
        
        return html;
    }

    // Add copy buttons to code blocks
    addCodeCopyButtons(messageElement) {
        const codeBlocks = messageElement.querySelectorAll('pre code');
        codeBlocks.forEach((codeBlock, index) => {
            const pre = codeBlock.parentElement;
            
            // Wrap pre in container for positioning
            const container = document.createElement('div');
            container.className = 'code-block-container';
            pre.parentNode.insertBefore(container, pre);
            container.appendChild(pre);
            
            // Create copy button
            const copyBtn = document.createElement('button');
            copyBtn.className = 'code-copy-btn';
            copyBtn.textContent = 'Copy';
            copyBtn.setAttribute('data-code-index', index);
            
            copyBtn.addEventListener('click', () => {
                this.copyCodeToClipboard(codeBlock.textContent, copyBtn);
            });
            
            container.appendChild(copyBtn);
        });
    }

    // Copy code to clipboard
    async copyCodeToClipboard(code, button) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(code);
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = code;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            
            // Show feedback
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            button.style.background = 'var(--primary-color)';
            button.style.color = 'white';
            
            setTimeout(() => {
                button.textContent = originalText;
                button.style.background = '';
                button.style.color = '';
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
        const chatMessages = document.getElementById('chatMessages');
        
        // Remove any existing typing indicator
        const existingIndicator = chatMessages.querySelector('.typing-indicator');
        if (existingIndicator) {
            chatMessages.removeChild(existingIndicator);
        }
        
        // Add new typing indicator
        const typingDots = document.createElement('div');
        typingDots.className = 'typing-indicator';
        typingDots.innerHTML = '<span></span><span></span><span></span>';
        chatMessages.appendChild(typingDots);
        
        // Scroll to show the typing indicator
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    hideTypingIndicator() {
        const chatMessages = document.getElementById('chatMessages');
        const typingIndicator = chatMessages.querySelector('.typing-indicator');
        if (typingIndicator && typingIndicator.parentNode) {
            chatMessages.removeChild(typingIndicator);
        }
    }
    
    async simulateBotResponse(userMessage) {
        console.log('Sending message to Gemini backend:', userMessage);
        
        try {
            // Call your backend with the message and the current history
            const response = await fetch(`${backendUrl}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userMessage,
                    history: this.chatHistory, // Send current history
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP error! status: ${response.status}, details: ${errorData.detail}`);
            }

            const data = await response.json();
            
            this.hideTypingIndicator();
            
            // Add the bot's response to the UI
            this.addMessage(data.response, 'bot');
            
            // IMPORTANT: Update the local history with the one from the backend
            this.chatHistory = data.history;
            
            // Save the updated history to localStorage
            this.saveCurrentChat();
            
            console.log('Gemini response received and history updated.');
            
        } catch (error) {
            console.error('Failed to get response from backend:', error);
            this.hideTypingIndicator();
            const fallbackResponse = "I'm having trouble connecting to my brain right now. Please check if the backend server is running and try again.";
            this.addMessage(fallbackResponse, 'bot');
        }
        
        this.isWaitingForResponse = false;
        this.updateSendBtnState();
        if (this.overlayInput) {
            this.overlayInput.focus();
        }
        
        this.notifyHeightChange();
        console.log('Bot response completed');
    }

    // Generate or retrieve session ID for backend communication
    getSessionId() {
        if (!this.sessionId) {
            this.sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            console.log('Generated new session ID:', this.sessionId);
        }
        return this.sessionId;
    }

    // Method to clear the current chat session on backend
    async clearBackendSession() {
        // This method is no longer needed with the stateless backend
        console.log("Clearing chat history locally.");
        this.messages = [];
        this.chatHistory = [];
        this.currentChatId = null;
        this.saveCurrentChat(); // This will effectively clear it in localStorage
        
        // Optionally, reload the page or clear the UI
        window.location.reload();
    }

    generateBotResponse(userMessage) {
        const message = userMessage.toLowerCase();
        
        // Academic responses
        if (message.includes('assignment') || message.includes('homework')) {
            return [
                "I'd be happy to help you with your assignment! Could you share more details about what you're working on?",
                "Assignments can be challenging. What specific part are you struggling with?",
                "Let me help you break down your assignment into manageable steps. What subject is it for?"
            ];
        }
        
        if (message.includes('math') || message.includes('calculus') || message.includes('algebra')) {
            return [
                "Math is one of my favorite subjects! What specific math problem are you working on?",
                "I can help with various math topics. Share your problem and I'll walk you through it step by step.",
                "Mathematics requires practice and understanding. What concept would you like to explore?"
            ];
        }
        
        if (message.includes('programming') || message.includes('code') || message.includes('python') || message.includes('javascript')) {
            return [
                "Programming is exciting! What language are you working with and what's your question?",
                "I love helping with coding problems. Share your code or describe what you're trying to build.",
                "Programming can be tricky at first, but it gets easier with practice. What's your current challenge?"
            ];
        }
        
        if (message.includes('science') || message.includes('physics') || message.includes('chemistry') || message.includes('biology')) {
            return [
                "Science is fascinating! Which scientific concept would you like to explore today?",
                "I can help explain scientific principles and concepts. What are you curious about?",
                "Science opens up so many possibilities. What specific topic interests you?"
            ];
        }
        
        // Study help
        if (message.includes('study') || message.includes('exam') || message.includes('test')) {
            return [
                "Effective studying is key to success! What subject are you preparing for?",
                "I can help you create a study plan. What exam are you preparing for and when is it?",
                "Study strategies vary by subject. Tell me what you're studying and I'll suggest the best approach."
            ];
        }
        
        // General help
        if (message.includes('help') || message.includes('stuck') || message.includes('confused')) {
            return [
                "I'm here to help! Can you describe what you're having trouble with?",
                "No problem at all! The best way I can help is if you share more details about your question.",
                "Let's work through this together. What specifically is confusing you?"
            ];
        }
        
        // Greetings
        if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
            return [
                "Hello! I'm Siksha Sathi, your AI learning companion. How can I help you today?",
                "Hi there! Ready to learn something new? What subject interests you?",
                "Hey! Great to see you. What would you like to explore or learn about today?"
            ];
        }
        
        if (message.includes('how are you') || message.includes('how do you do')) {
            return [
                "I'm doing great and ready to help you learn! What brings you here today?",
                "I'm fantastic, thank you for asking! How can I assist with your studies?",
                "I'm here and eager to help! What academic topic can we dive into?"
            ];
        }
        
        // Default responses
        return [
            "That's an interesting question! Could you provide a bit more context so I can give you the best help?",
            "I'd love to help you with that. Can you share more details about what you're looking for?",
            "Great question! To give you the most accurate answer, could you tell me more about your specific needs?",
            "I'm here to support your learning journey. What specific aspect would you like to explore further?",
            "Excellent! I can help with that. Could you provide some additional details about your question?"
        ];
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

        if (hasContent) {
            this.overlayInput.classList.add('has-content');
        } else {
            this.overlayInput.classList.remove('has-content');
        }

        this.notifyHeightChange();
    }
    
    updateSendBtnState() {
        if (!this.sendBtn || !this.overlayInput) return;
        
        const hasContent = this.overlayInput.textContent.trim().length > 0;
        const isButtonActive = hasContent && !this.isWaitingForResponse;
        
        if (isButtonActive) {
            this.sendBtn.classList.remove('inactive');
            this.sendBtn.removeAttribute('disabled');
        } else {
            this.sendBtn.classList.add('inactive');
            this.sendBtn.setAttribute('disabled', 'disabled');
        }
    }
    
    updatePlaceholderVisibility() {
        if (!this.overlayInput) return;
        
        // Check if input is truly empty (no text content, even after trimming)
        const isEmpty = this.overlayInput.textContent.trim() === '';
        
        if (isEmpty) {
            // Clear any leftover whitespace or empty nodes
            this.overlayInput.innerHTML = '';
        }
    }
    
    // send button logic removed
    
    // message counter functionality removed
    
    // Widget state management
    openWidget() {
        this.isOpen = true;
        if (this.chatContainer) {
            this.chatContainer.style.display = 'flex';
        }
        this.notifyParent('widget-opened', { isOpen: true });
        this.notifyHeightChange();
    }
    
    closeWidget() {
        this.isOpen = false;
        if (this.chatContainer) {
            this.chatContainer.style.display = 'none';
        }
        this.notifyParent('widget-closed', { isOpen: false });
    }
    
    toggleWidget() {
        if (this.isOpen) {
            this.closeWidget();
        } else {
            this.openWidget();
        }
    }
    
    // Theme management
    initializeTheme() {
        try {
            const savedTheme = localStorage.getItem('siksha-sathi-theme');
            const theme = savedTheme && (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'dark';
            this.setTheme(theme);
        } catch (error) {
            console.error('Error initializing theme:', error);
            this.setTheme('dark'); // Fallback to default
        }
    }

    setTheme(theme) {
        if (theme !== 'light' && theme !== 'dark') return;
        this.currentTheme = theme;
        
        // With a single stylesheet, just set the data-theme attribute
        document.documentElement.setAttribute('data-theme', theme);

        // Update the visual state of the theme button if present
        try {
            localStorage.setItem('siksha-sathi-theme', theme);
        } catch (error) {
            console.error('Error saving theme preference:', error);
        }

        if (this.themeModeBtn) {
            this.themeModeBtn.classList.remove('sun-active', 'moon-active');
            if (theme === 'dark') this.themeModeBtn.classList.add('moon-active');
            else this.themeModeBtn.classList.add('sun-active');
        }

        this.notifyParent('theme-changed', { theme });
    }
    
    // Chat history management
    loadChatHistory() {
        try {
            const chatList = JSON.parse(localStorage.getItem('siksha-sathi-chatlist') || '[]');
            if (chatList.length > 0) {
                // Load the most recent chat
                const mostRecentChatId = chatList[0];
                const chatData = JSON.parse(localStorage.getItem(mostRecentChatId) || '{}');
                
                if (chatData.history) {
                    this.currentChatId = mostRecentChatId;
                    this.chatHistory = chatData.history;
                    
                    // Re-render the messages from history
                    this.messagesContainer.innerHTML = ''; // Clear existing messages
                    this.chatHistory.forEach(entry => {
                        const role = entry.role;
                        const content = entry.parts.map(part => part.text).join('');
                        if (role === 'user' || role === 'model') {
                            this.addMessage(content, role === 'model' ? 'bot' : 'user');
                        }
                    });
                    
                    console.log(`Loaded chat ${this.currentChatId} with ${this.chatHistory.length} entries.`);
                }
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
            this.chatHistory = [];
        }
    }
    
    saveCurrentChat() {
        if (!this.currentChatId) {
            this.currentChatId = 'chat_' + Date.now();
        }
        
        const chatData = {
            id: this.currentChatId,
            title: this.generateChatTitle(),
            // The history from the backend is the source of truth
            history: this.chatHistory,
            timestamp: new Date().toISOString(),
        };
        
        try {
            // Save the entire conversation object to localStorage
            localStorage.setItem(this.currentChatId, JSON.stringify(chatData));
            
            // Also update a list of chat IDs to easily find them later
            let chatList = JSON.parse(localStorage.getItem('siksha-sathi-chatlist') || '[]');
            if (!chatList.includes(this.currentChatId)) {
                chatList.unshift(this.currentChatId);
                // Keep only the last 10 chats
                chatList = chatList.slice(0, 10);
                localStorage.setItem('siksha-sathi-chatlist', JSON.stringify(chatList));
            }
            
        } catch (error) {
            console.error('Error saving chat history:', error);
        }
    }
    
    generateChatTitle() {
        if (this.chatHistory.length === 0) return 'New Chat';
        
        // Find the first user message in the history for the title
        const firstUserMessage = this.chatHistory.find(entry => entry.role === 'user');
        if (firstUserMessage && firstUserMessage.parts) {
            const content = firstUserMessage.parts.find(part => part.text)?.text || '';
            const title = content.substring(0, 30);
            return title.length < content.length ? title + '...' : title;
        }
        
        return 'New Chat';
    }
    
    // Utility methods
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
    
    // Error handling
    handleError(error, context = 'Unknown') {
        console.error(`Siksha Sathi Widget Error [${context}]:`, error);
        
        if (this.isEmbedded) {
            this.notifyParent('widget-error', {
                error: error.message,
                context: context,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Cleanup method to prevent memory leaks
    destroy() {
        // Clear any running timeouts
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }

        // Remove event listeners
        if (this.overlayInput) {
            this.overlayInput.removeEventListener('input', this.debouncedInputHandler);
            this.overlayInput.removeEventListener('keydown', this.keydownHandler);
            this.overlayInput.removeEventListener('paste', this.pasteHandler);
        }

        // Clear references
        this.messages = [];
        this.chatHistory = [];
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.sikshaSathiWidget = new SikshaSathiWidget();
    } catch (error) {
        console.error('Failed to initialize Siksha Sathi Widget:', error);
    }
});

// Expose widget API for external access
window.SikshaSathiWidget = SikshaSathiWidget;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SikshaSathiWidget;
}
