// Modern ES6+ JavaScript with advanced features
class SikshaSathi {
    constructor() {
        this.initializeElements();
        this.setupEventListeners();
        this.loadTheme();
        this.initializeFeatures();
    }

    initializeElements() {
        // Core elements
        this.chatInput = document.getElementById('chatInput');
        this.sendButton = document.getElementById('sendButton');
        this.chatMessages = document.getElementById('chatMessages');
        this.userProfile = document.getElementById('userProfile');
        this.menuButton = document.getElementById('menuButton');

        // New modern elements
        this.themeToggle = document.getElementById('themeToggle');
    // Header area where bot status will appear
    this.headerControls = document.querySelector('.header-controls');
    // attach/voice/file inputs removed from DOM — no longer used
        this.messageCounter = document.getElementById('messageCounter');

    // Modal elements (file preview removed)

        // State management
        this.isRecording = false;
        this.currentTheme = 'dark';
        this.messageHistory = [];
    }

    setupEventListeners() {
        // Core functionality
        this.chatInput.addEventListener('input', this.handleInput.bind(this));
        this.chatInput.addEventListener('keypress', this.handleKeyPress.bind(this));
        this.sendButton.addEventListener('click', this.sendMessage.bind(this));

        // Modern features
        this.themeToggle.addEventListener('click', this.toggleTheme.bind(this));
    // attach/voice removed

        // Search functionality
    // search/preview removed earlier

        // Modal overlays
    // file preview removed

        // Profile and menu
        this.userProfile.addEventListener('click', () => this.openPopup('profilePopup'));
        this.menuButton.addEventListener('click', () => this.openPopup('menuPopup'));

        // Close popups
        document.querySelectorAll('.popup-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay || !e.target.closest('.popup')) {
                    overlay.classList.remove('active');
                }
            });
        });

        // Enhanced keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboard.bind(this));
    }

    initializeFeatures() {
        this.updateMessageCounter();
        this.setupAutoSave();
    // speech recognition removed to simplify UI
    }

    // Input handling
    handleInput() {
        this.autoResizeTextarea();
        this.updateMessageCounter();
    // Enable/disable send button based on content
    const hasText = this.chatInput.value.trim().length > 0;
    this.sendButton.disabled = !hasText;
    }

    handleKeyPress(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
        }
    }

    autoResizeTextarea() {
        this.chatInput.style.height = 'auto';
        this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 120) + 'px';
    }

    updateMessageCounter() {
        const count = this.chatInput.value.length;
        const max = 2000;
        this.messageCounter.textContent = `${count}/${max}`;
    this.messageCounter.style.color = count > max * 0.9 ? 'var(--error-color)' : 'var(--text-muted)';
    }

    // Message handling
    async sendMessage() {
        const message = this.chatInput.value.trim();
        if (message === '') return;

        // Clear welcome message
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        // Add user message
        this.addMessage(message, 'user');
        this.messageHistory.push({ type: 'user', content: message, timestamp: new Date() });

        // Clear input
        this.chatInput.value = '';
        this.updateMessageCounter();
        this.autoResizeTextarea();
    // Disable send while waiting for response
    this.sendButton.disabled = true;

        // Show inline typing placeholder in the message flow
        this.showInlineTyping();

        // Simulate AI response (replace with actual API call)
        setTimeout(() => {
            const response = this.generateResponse(message);
            this.hideInlineTyping();
            this.addMessage(response, 'bot');
            this.messageHistory.push({ type: 'bot', content: response, timestamp: new Date() });
        }, 1500 + Math.random() * 1000);
    }

    showInlineTyping() {
        // If there is already a placeholder, don't add another
        if (this.chatMessages.querySelector('.typing-placeholder')) return;
        const indicator = document.createElement('div');
        indicator.className = 'message typing-placeholder';
        // Insert only the dots (no bubble wrapper)
        indicator.innerHTML = `
            <div class="typing-dots typing-dots-inline">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
            </div>
        `;
        this.chatMessages.appendChild(indicator);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    hideInlineTyping() {
        const el = this.chatMessages.querySelector('.typing-placeholder');
        if (el) el.remove();
    }

    // header-level status removed in favor of inline typing placeholder

    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;

        const content = document.createElement('div');
        content.className = 'message-content';
        content.textContent = text;
        // Build meta info inside the bubble.
        // For bot: "Siksha Sathi • timestamp" (left-aligned)
        // For user: "timestamp • User Name" (right-aligned)
        const meta = document.createElement('div');
        meta.className = 'message-meta';
        // Determine username from profile if available
        const profileName = (this.userProfile && this.userProfile.querySelector('.profile-name'))
            ? this.userProfile.querySelector('.profile-name').textContent.trim()
            : 'You';
        const timestr = this.formatTime(new Date());
        if (sender === 'user') {
            meta.innerHTML = `
                <span class="meta-timestamp">${timestr}</span>
                <span class="meta-sep" aria-hidden="true">•</span>
                <span class="meta-username">${profileName}</span>
            `;
        } else {
            meta.innerHTML = `
                <span class="meta-username">Siksha Sathi</span>
                <span class="meta-sep" aria-hidden="true">•</span>
                <span class="meta-timestamp">${timestr}</span>
            `;
        }

        const actions = document.createElement('div');
        actions.className = 'message-actions';
        actions.innerHTML = `
            <button class="message-action-btn" onclick="sikshaSathi.copyMessage('${text.replace(/'/g, "\\'")}')" title="Copy">📋</button>
        `;

        // append content, meta (inside bubble), and actions
        content.appendChild(meta);
        messageDiv.appendChild(content);
        messageDiv.appendChild(actions);

        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

        // Add to message history for search
        this.messageHistory.push({
            element: messageDiv,
            content: text,
            type: sender,
            timestamp: new Date()
        });
    }

    generateResponse(userMessage) {
        const responses = [
            `I understand you're asking about "${userMessage}". Let me help you with that. Here's what you need to know:`,
            `Great question about ${userMessage}! Based on what you've asked, I can provide you with a comprehensive answer.`,
            `Thanks for asking about ${userMessage}! I'm here to help you understand this concept better.`,
            `Perfect question! Let me break down ${userMessage} for you step by step.`,
            `I see you're curious about ${userMessage}. Let me provide you with a detailed explanation.`
        ];

        return responses[Math.floor(Math.random() * responses.length)] +
               " This is a demo response showing the modern chatbot interface. In a real implementation, this would be connected to an AI API that provides intelligent responses to your educational queries.";
    }

    formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Theme management
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        this.saveTheme();
        this.updateThemeIcon();
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        this.currentTheme = savedTheme;
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon();
    }

    saveTheme() {
        localStorage.setItem('theme', this.currentTheme);
    }

    updateThemeIcon() {
        const icon = this.themeToggle.querySelector('.theme-icon');
        icon.textContent = this.currentTheme === 'dark' ? '🌙' : '☀️';
    }

    // File handling
    // file attach/preview removed to simplify UI

    // Voice input
    // voice input removed to simplify UI

    // Utility functions
    openPopup(popupId) {
        document.getElementById(popupId).classList.add('active');
    }

    copyMessage(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification('Message copied!', 'success');
        });
    }

    // typing indicator removed

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Enhanced keyboard shortcuts
    handleKeyboard(e) {
        // Ctrl/Cmd + / to focus input
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            this.chatInput.focus();
        }

        // Escape to close modals
            if (e.key === 'Escape') {
                // Close active popups and overlays
            document.querySelectorAll('.popup-overlay.active').forEach(popup => {
                popup.classList.remove('active');
            });
        }
    }

    // Auto-save functionality
    setupAutoSave() {
        setInterval(() => {
            if (this.messageHistory.length > 0) {
                localStorage.setItem('chatHistory', JSON.stringify(this.messageHistory));
            }
        }, 30000); // Save every 30 seconds
    }

    // Welcome suggestions
    sendSuggestion(suggestion) {
        this.chatInput.value = suggestion;
        this.updateMessageCounter();
        this.autoResizeTextarea();
        this.chatInput.focus();
    }

    // Export functionality
    exportChat() {
        const chatData = {
            messages: this.messageHistory,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showNotification('Chat exported successfully!', 'success');
        this.closePopup('profilePopup');
    }

    clearChat() {
        if (confirm('Are you sure you want to clear all messages?')) {
            this.chatMessages.innerHTML = `
                <div class="welcome-message">
                    <div class="welcome-avatar">
                        <span class="avatar-icon">🎓</span>
                    </div>
                    <h2>Welcome to Siksha Sathi</h2>
                    <p>Ask me your doubts</p>
                    <div class="welcome-suggestions">
                        <button class="suggestion-chip" onclick="sendSuggestion('Explain photosynthesis')">Explain photosynthesis</button>
                        <button class="suggestion-chip" onclick="sendSuggestion('Solve 2x + 3 = 7')">Solve 2x + 3 = 7</button>
                        <button class="suggestion-chip" onclick="sendSuggestion('What is machine learning?')">What is machine learning?</button>
                    </div>
                </div>
            `;
            this.messageHistory = [];
            localStorage.removeItem('chatHistory');
            this.showNotification('Chat cleared', 'success');
        }
        this.closePopup('profilePopup');
    }

    closePopup(popupId) {
        document.getElementById(popupId).classList.remove('active');
    }
}

// Legacy functions for backward compatibility
function switchUser() {
    sikshaSathi.showNotification('Switch User functionality coming soon!', 'info');
    sikshaSathi.closePopup('profilePopup');
}

function signOut() {
    sikshaSathi.showNotification('Sign Out functionality coming soon!', 'info');
    sikshaSathi.closePopup('profilePopup');
}

function createNewChat() {
    sikshaSathi.clearChat();
}

function loadChat(chatId) {
    sikshaSathi.showNotification(`Loading chat: ${chatId}`, 'info');
    sikshaSathi.closePopup('menuPopup');
}

function exportChat() {
    sikshaSathi.exportChat();
}

function clearChat() {
    sikshaSathi.clearChat();
}

function copyMessage(text) {
    sikshaSathi.copyMessage(text);
}

function sendSuggestion(suggestion) {
    sikshaSathi.sendSuggestion(suggestion);
}

// Initialize the modern chatbot
const sikshaSathi = new SikshaSathi();

// Add modern CSS for notifications
const style = document.createElement('style');
style.textContent = `
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 3000;
    animation: slideInRight 0.3s ease-out;
    backdrop-filter: blur(10px);
    border: 1px solid var(--overlay-10);
}

.notification-success {
    background: rgba(16, 185, 129, 0.9);
    color: var(--on-primary);
}

.notification-error {
    background: rgba(239, 68, 68, 0.9);
    color: var(--on-primary);
}

.notification-info {
    background: rgba(59, 130, 246, 0.9);
    color: var(--on-primary);
}

.search-result-item {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color);
    cursor: pointer;
    transition: background var(--transition-fast);
}

.search-result-item:hover {
    background: var(--bg-secondary);
}

.search-result-content {
    margin-bottom: 4px;
}

.search-result-content mark {
    background: var(--primary-color);
    color: var(--on-primary);
    padding: 2px 4px;
    border-radius: 3px;
}

.search-result-meta {
    font-size: 12px;
    color: var(--text-muted);
}

.no-results {
    padding: 20px;
    text-align: center;
    color: var(--text-muted);
}
`;
document.head.appendChild(style);
