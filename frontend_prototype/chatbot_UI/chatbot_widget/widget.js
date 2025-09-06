/**
 * Siksha Sathi Widget - JavaScript functionality for embeddable chatbot
 * Provides core chat functionality and postMessage API for iframe integration
 */

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

        // Initialize widget
        this.initializeElements();
        this.setupEventListeners();
        this.setupEmbedCommunication();
        this.loadChatHistory();
        this.initializeTheme(); // Set initial theme

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
    
    detectEmbedMode() {
        // Check if running in iframe
        const inIframe = window.self !== window.top;
        
        // Check URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const embedParam = urlParams.get('embed') === '1';
        const openParam = urlParams.get('open') === '1';
        
        if (openParam) {
            this.isOpen = true;
        }
        
        return inIframe || embedParam;
    }
    
    initializeElements() {
        // Core elements
        this.chatContainer = document.querySelector('.widget-chatbot-container');
        this.messagesContainer = document.querySelector('.chat-messages');
    // Legacy chatInput removed; overlayInput is the canonical input element
    this.chatInput = null;
    // send button removed
        
        // Header elements
        this.menuButton = document.querySelector('#menuButton');
        this.headerTitle = document.querySelector('.header-title h1');
            this.themeModeBtn = document.querySelector('#themeModeBtn');
            this.sunIcon = document.querySelector('.theme-mode-icon.sun-icon');
            this.moonIcon = document.querySelector('.theme-mode-icon.moon-icon');
        
        // Popup elements
        this.menuPopup = document.querySelector('#menuPopup');
        this.historyPopup = document.querySelector('.history-popup');
        this.popupOverlay = document.querySelector('.popup-overlay');
        
        // Suggestion chips
    this.suggestionChips = document.querySelectorAll('.suggestion-chip');
    this.overlayInput = document.querySelector('#overlayInput');
        
        // Initialize input hint and contenteditable behavior
        if (this.overlayInput) {
            // Set up contenteditable behavior
            this.setupContentEditableInput();
        }
        // Initialize theme icon to reflect current theme
            // set initial active class based on saved or default theme
            const current = document.documentElement.getAttribute('data-theme') || 'dark';
            if (this.themeModeBtn) {
                this.themeModeBtn.classList.remove('sun-active', 'moon-active', 'rotating');
                if (current === 'dark') this.themeModeBtn.classList.add('moon-active');
                else this.themeModeBtn.classList.add('sun-active');
            }
    // Removed chatInput placeholder initialization
        
    // message counter removed
    }
    
    setupContentEditableInput() {
        if (!this.overlayInput) return;

        // Handle input events
        this.overlayInput.addEventListener('input', () => {
            this.autoResizeInput();
            this.notifyHeightChange();
        });

        // Handle Enter key
        this.overlayInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!this.isWaitingForResponse) {
                    this.handleSendMessage();
                }
            }
        });

        // Paste handling to keep text only
        this.overlayInput.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text');
            document.execCommand('insertText', false, text);
        });

        // Initialize
        this.autoResizeInput();
    }
    
    setupEventListeners() {
        // Send message events
        // (Removed send button and keydown handling - now handled in setupContentEditableInput)
        
        // Header controls
        if (this.menuButton) {
            this.menuButton.addEventListener('click', () => this.toggleMenuDropdown());
        }

        if (this.themeModeBtn) {
                this.themeModeBtn.addEventListener('click', () => {
                    // Trigger rotation animation immediately
                    this.themeModeBtn.classList.add('rotating');

                    const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
                    // Update active class to show the target icon
                    if (nextTheme === 'dark') {
                        this.themeModeBtn.classList.remove('sun-active');
                        this.themeModeBtn.classList.add('moon-active');
                    } else {
                        this.themeModeBtn.classList.remove('moon-active');
                        this.themeModeBtn.classList.add('sun-active');
                    }

                    this.setTheme(nextTheme);

                    // Remove rotating class after animation duration
                    setTimeout(() => this.themeModeBtn.classList.remove('rotating'), 520);
                });
        }
        
        // Suggestion chips
        this.suggestionChips.forEach(chip => {
            chip.addEventListener('click', () => {
                if (!this.isWaitingForResponse) {
                    const text = chip.textContent.trim();
                    if (this.overlayInput) this.overlayInput.textContent = text;
                    this.handleSendMessage();
                }
            });
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeMenuDropdown();
            }
        });
        
        // Window resize for responsive updates
        window.addEventListener('resize', () => {
            this.notifyHeightChange();
        });
    }
    
    setupEmbedCommunication() {
        if (!this.isEmbedded) return;
        
        // Listen for messages from parent window
        window.addEventListener('message', (event) => {
            if (!event.data || !event.data.type) return;
            
            switch (event.data.type) {
                case 'open-widget':
                    this.openWidget();
                    break;
                case 'close-widget':
                    this.closeWidget();
                    break;
                case 'toggle-widget':
                    this.toggleWidget();
                    break;
                case 'send-message':
                    if (event.data.message && this.overlayInput) {
                        this.overlayInput.textContent = event.data.message;
                        this.handleSendMessage();
                    }
                    break;
                case 'set-theme':
                    this.setTheme(event.data.theme);
                    break;
                case 'get-status':
                    this.notifyParent('status-response', {
                        isOpen: this.isOpen,
                        messageCount: this.messageCount,
                        hasUnread: false
                    });
                    break;
            }
        });
    }
    
    notifyParent(type, data = {}) {
        if (!this.isEmbedded) return;
        
        const message = {
            type: type,
            source: 'siksha-sathi-widget',
            timestamp: new Date().toISOString(),
            ...data
        };
        
        window.parent.postMessage(message, '*');
    }
    
    notifyHeightChange() {
        if (!this.isEmbedded) return;
        
        // Calculate total content height
        const height = Math.max(
            this.chatContainer.scrollHeight,
            400 // minimum height
        );
        
        this.notifyParent('height-changed', { height });
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
        
        // Show typing indicator immediately
        this.showTypingIndicator();
        
        // Simulate bot response
        setTimeout(() => {
            this.simulateBotResponse(message);
        }, 1000 + Math.random() * 1000);
        
        // Notify parent about message sent
        this.notifyParent('message-sent', {
            message: message,
            messageCount: this.messageCount
        });
        
        this.notifyHeightChange();
    }    addMessage(content, sender = 'bot', options = {}) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${sender}`;
        
        const now = new Date();
        const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageElement.innerHTML = `
            <div class="message-content">${this.escapeHtml(content)}</div>
            <div class="message-meta">
                <span class="meta-username">${sender === 'user' ? 'You' : 'Siksha Sathi'}</span>
                <span class="meta-timestamp">${timestamp}</span>
            </div>
        `;
        
        // Hide welcome message if it exists
        const welcomeMessage = this.messagesContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
        
        this.messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
        
        // Store message
        const messageData = {
            id: Date.now() + Math.random(),
            content,
            sender,
            timestamp: now.toISOString()
        };
        
        this.messages.push(messageData);
        this.messageCount++;
        
        // Save to localStorage
        this.saveCurrentChat();
        
        return messageElement;
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
    
    simulateBotResponse(userMessage) {
        console.log('Simulating bot response for:', userMessage);
        
        // Wait a bit to show the typing indicator, then respond
        setTimeout(() => {
            // Remove typing indicator
            this.hideTypingIndicator();
            
            // Generate and add bot response
            const responses = this.generateBotResponse(userMessage);
            const response = responses[Math.floor(Math.random() * responses.length)];
            
            this.addMessage(response, 'bot');
            
            // Re-enable sending after bot responds
            this.isWaitingForResponse = false;
            if (this.overlayInput) {
                this.overlayInput.focus(); // Focus back to input
            }
            
            this.notifyHeightChange();
            console.log('Bot response completed');
        }, 1500 + Math.random() * 1000); // Show typing indicator for 1.5-2.5 seconds
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
    
    // send button logic removed
    
    // message counter functionality removed
    
    // Popup Management
    toggleMenuDropdown() {
        const dropdown = document.querySelector('.menu-dropdown');
        if (dropdown && dropdown.classList.contains('active')) {
            this.closeMenuDropdown();
        } else {
            this.showMenuDropdown();
        }
    }

    showMenuDropdown() {
        this.closeMenuDropdown();
        
        // Create dropdown if it doesn't exist
        let dropdown = document.querySelector('.menu-dropdown');
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.className = 'menu-dropdown';
            this.menuButton.parentNode.appendChild(dropdown);
        }
        
        // Update dropdown content
        dropdown.innerHTML = `
            <div class="menu-dropdown-item" data-action="export">
                <span class="menu-dropdown-item-icon">📤</span>
                <span>Export Chat</span>
            </div>
            <div class="menu-dropdown-item" data-action="clear">
                <span class="menu-dropdown-item-icon">🗑️</span>
                <span>Clear Chat</span>
            </div>
        `;

        // Add event listeners to menu items
        const exportItem = dropdown.querySelector('[data-action="export"]');
        const clearItem = dropdown.querySelector('[data-action="clear"]');

        if (exportItem) {
            exportItem.addEventListener('click', () => {
                this.exportChat();
                this.closeMenuDropdown();
            });
        }

        if (clearItem) {
            clearItem.addEventListener('click', () => {
                this.clearChat();
                this.closeMenuDropdown();
            });
        }

        // Show dropdown
        dropdown.classList.add('active');
        
        // Add click outside listener
        setTimeout(() => {
            document.addEventListener('click', this.handleClickOutside);
        }, 10);
    }
    
    closeMenuDropdown() {
        const dropdown = document.querySelector('.menu-dropdown');
        if (dropdown) {
            dropdown.classList.remove('active');
        }
        document.removeEventListener('click', this.handleClickOutside);
    }
    
    handleClickOutside = (event) => {
        const dropdown = document.querySelector('.menu-dropdown');
        const menuButton = document.getElementById('menuButton');
        
        if (dropdown && menuButton && 
            !dropdown.contains(event.target) && 
            !menuButton.contains(event.target)) {
            this.closeMenuDropdown();
        }
    }
    
    showPopup(popup) {
        this.closeMenuDropdown();
        if (popup && this.popupOverlay) {
            popup.style.display = 'block';
            this.popupOverlay.classList.add('active');
        }
    }
    
    closeAllPopups() {
        this.closeMenuDropdown();
    }
    
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

        try {
            localStorage.setItem('siksha-sathi-theme', theme);
        } catch (error) {
            console.error('Error saving theme preference:', error);
        }
        this.notifyParent('theme-changed', { theme });
    }    // Chat history management
    loadChatHistory() {
        try {
            const history = localStorage.getItem('siksha-sathi-history');
            if (history) {
                this.chatHistory = JSON.parse(history);
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
            this.chatHistory = [];
        }
    }
    
    saveCurrentChat() {
        if (this.messages.length === 0) return;
        
        const chatData = {
            id: this.currentChatId || Date.now(),
            title: this.generateChatTitle(),
            messages: this.messages,
            timestamp: new Date().toISOString(),
            messageCount: this.messageCount
        };
        
        // Update or add chat to history
        const existingIndex = this.chatHistory.findIndex(chat => chat.id === chatData.id);
        if (existingIndex >= 0) {
            this.chatHistory[existingIndex] = chatData;
        } else {
            this.chatHistory.unshift(chatData);
            this.currentChatId = chatData.id;
        }
        
        // Keep only last 10 chats
        this.chatHistory = this.chatHistory.slice(0, 10);
        
        try {
            localStorage.setItem('siksha-sathi-history', JSON.stringify(this.chatHistory));
        } catch (error) {
            console.error('Error saving chat history:', error);
        }
    }
    
    generateChatTitle() {
        if (this.messages.length === 0) return 'New Chat';
        
        // Get the first user message for the title
        const firstUserMessage = this.messages.find(msg => msg.sender === 'user');
        if (firstUserMessage) {
            // Truncate to 30 characters
            const title = firstUserMessage.content.substring(0, 30);
            return title.length < firstUserMessage.content.length ? title + '...' : title;
        }
        
        return 'New Chat';
    }
    
    exportChat() {
        try {
            const chatData = {
                timestamp: new Date().toISOString(),
                messages: this.messages,
                messageCount: this.messageCount
            };

            const dataStr = JSON.stringify(chatData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `siksha-sathi-chat-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Show success message
            this.addMessage('Chat exported successfully! 📤', 'bot');
        } catch (error) {
            console.error('Error exporting chat:', error);
            this.addMessage('Failed to export chat. Please try again.', 'bot');
        }
    }

    clearChat() {
        try {
            // Clear messages from UI by removing only message elements
            const messages = this.messagesContainer.querySelectorAll('.message');
            messages.forEach(msg => msg.remove());

            // Show the welcome message again
            const welcomeMessage = this.messagesContainer.querySelector('.welcome-message');
            if (welcomeMessage) {
                welcomeMessage.style.display = 'block';
            }

            // Clear messages array and reset counters
            this.messages = [];
            this.messageCount = 0;

            // Clear localStorage for the current chat session
            try {
                // A more robust way would be to remove the specific chat from history
                // For now, we clear the whole history as per original logic, but this could be improved
                localStorage.removeItem('siksha-sathi-history');
            } catch (error) {
                console.error('Error clearing localStorage:', error);
            }

            // Reset current chat ID
            this.currentChatId = null;

            // Add a confirmation message to the UI
            this.addMessage('Chat cleared successfully! 🗑️', 'bot');
        } catch (error) {
            console.error('Error clearing chat:', error);
            this.addMessage('Failed to clear chat. Please try again.', 'bot');
        }
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
