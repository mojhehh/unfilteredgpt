// Unfiltered AI - Production Ready
class UnfilteredAI {
    constructor() {
        this.chats = JSON.parse(localStorage.getItem('unfiltered_chats') || '[]');
        this.currentChatId = null;
        this.settings = JSON.parse(localStorage.getItem('unfiltered_settings') || '{}');
        this.isProcessing = false;
        this.init();
    }

    init() {
        this.bindElements();
        this.bindEvents();
        this.renderChatList();
        this.loadSettings();
        if (this.chats.length > 0) {
            this.loadChat(this.chats[0].id);
        }
        this.initAds();
    }

    bindElements() {
        this.sidebar = document.getElementById('sidebar');
        this.sidebarOverlay = document.getElementById('sidebarOverlay');
        this.chatList = document.getElementById('chatList');
        this.newChatBtn = document.getElementById('newChatBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.menuBtn = document.getElementById('menuBtn');
        this.mobileNewChat = document.getElementById('mobileNewChat');
        this.chatContainer = document.getElementById('chatContainer');
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.messagesContainer = document.getElementById('messages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.webSearchToggle = document.getElementById('webSearchToggle');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettings = document.getElementById('closeSettings');
        this.apiEndpoint = document.getElementById('apiEndpoint');
        this.customInstructions = document.getElementById('customInstructions');
        this.aiPreferences = document.getElementById('aiPreferences');
        this.saveSettingsBtn = document.getElementById('saveSettings');
        this.clearAllDataBtn = document.getElementById('clearAllData');
        this.quickActions = document.querySelectorAll('.quick-actions .chip');
    }

    bindEvents() {
        this.newChatBtn.addEventListener('click', () => this.newChat());
        this.mobileNewChat.addEventListener('click', () => this.newChat());

        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 200) + 'px';
            this.sendBtn.disabled = !this.messageInput.value.trim();
        });

        this.menuBtn.addEventListener('click', () => this.toggleSidebar());
        this.sidebarOverlay.addEventListener('click', () => this.closeSidebar());

        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.closeSettings.addEventListener('click', () => this.closeSettingsModal());
        this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        this.clearAllDataBtn.addEventListener('click', () => this.clearAllData());
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) this.closeSettingsModal();
        });

        this.quickActions.forEach(chip => {
            chip.addEventListener('click', () => {
                const prompt = chip.dataset.prompt;
                const enableSearch = chip.dataset.search === 'true';
                if (enableSearch) {
                    this.webSearchToggle.checked = true;
                }
                this.messageInput.value = prompt + ' ';
                this.messageInput.focus();
                this.sendBtn.disabled = false;
            });
        });
    }

    initAds() {
        try {
            (adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.log('Ads not loaded');
        }
    }

    newChat() {
        this.currentChatId = null;
        this.welcomeScreen.style.display = 'flex';
        this.messagesContainer.classList.remove('active');
        this.messagesContainer.innerHTML = '';
        this.messageInput.value = '';
        this.messageInput.focus();
        this.sendBtn.disabled = true;
        document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
        this.closeSidebar();
    }

    createChat() {
        const chat = {
            id: Date.now().toString(),
            title: 'New Chat',
            messages: [],
            createdAt: new Date().toISOString()
        };
        this.chats.unshift(chat);
        this.saveChats();
        this.renderChatList();
        return chat.id;
    }

    loadChat(chatId) {
        const chat = this.chats.find(c => c.id === chatId);
        if (!chat) return;

        this.currentChatId = chatId;
        this.welcomeScreen.style.display = 'none';
        this.messagesContainer.classList.add('active');
        this.messagesContainer.innerHTML = '';

        chat.messages.forEach(msg => {
            this.renderMessage(msg.role, msg.content, false);
        });

        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.toggle('active', item.dataset.id === chatId);
        });

        this.scrollToBottom();
        this.closeSidebar();
    }

    deleteChat(chatId) {
        if (confirm('Delete this chat?')) {
            this.chats = this.chats.filter(c => c.id !== chatId);
            this.saveChats();
            this.renderChatList();
            if (this.currentChatId === chatId) {
                this.newChat();
            }
        }
    }

    saveChats() {
        localStorage.setItem('unfiltered_chats', JSON.stringify(this.chats));
    }

    renderChatList() {
        this.chatList.innerHTML = this.chats.map(chat => `
            <div class="chat-item ${chat.id === this.currentChatId ? 'active' : ''}" data-id="${chat.id}">
                <span class="chat-item-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                </span>
                <div class="chat-item-content">
                    <div class="chat-item-title">${this.escapeHtml(chat.title)}</div>
                    <div class="chat-item-date">${this.formatDate(chat.createdAt)}</div>
                </div>
                <button class="chat-item-delete" title="Delete">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                </button>
            </div>
        `).join('');

        this.chatList.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.chat-item-delete')) {
                    this.loadChat(item.dataset.id);
                }
            });

            item.querySelector('.chat-item-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteChat(item.dataset.id);
            });
        });
    }

    async sendMessage() {
        const content = this.messageInput.value.trim();
        if (!content || this.isProcessing) return;

        this.isProcessing = true;

        if (!this.currentChatId) {
            this.currentChatId = this.createChat();
            this.welcomeScreen.style.display = 'none';
            this.messagesContainer.classList.add('active');
        }

        const chat = this.chats.find(c => c.id === this.currentChatId);
        const isFirstMessage = chat.messages.length === 0;
        const webSearchEnabled = this.webSearchToggle.checked;

        chat.messages.push({ role: 'user', content });
        this.renderMessage('user', content);
        this.saveChats();

        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';
        this.sendBtn.disabled = true;

        // Show search indicator if web search is enabled
        if (webSearchEnabled) {
            this.showSearchIndicator();
        }

        // Show typing indicator
        this.showTypingIndicator();

        try {
            const apiUrl = this.settings.apiEndpoint || 'https://unfiltered-ai.modmojheh.workers.dev';
            
            let customInstructions = '';
            if (this.settings.customInstructions) {
                customInstructions += this.settings.customInstructions + '\n';
            }
            if (this.settings.aiPreferences) {
                customInstructions += 'Response style preferences: ' + this.settings.aiPreferences;
            }

            const response = await fetch(`${apiUrl}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: chat.messages,
                    generateTitle: isFirstMessage,
                    customInstructions: customInstructions || undefined,
                    webSearch: webSearchEnabled,
                    searchQuery: content
                })
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            this.hideSearchIndicator();
            this.hideTypingIndicator();

            const reply = data.reply || 'Sorry, I could not generate a response.';
            chat.messages.push({ role: 'assistant', content: reply });
            this.renderMessage('assistant', reply);

            if (data.title && isFirstMessage) {
                chat.title = data.title;
                this.renderChatList();
            }

            this.saveChats();

        } catch (error) {
            console.error('Error:', error);
            this.hideSearchIndicator();
            this.hideTypingIndicator();
            this.renderMessage('assistant', `Error: ${error.message}\n\nMake sure to configure your API endpoint in Settings.`);
        }

        this.isProcessing = false;
        this.scrollToBottom();
    }

    renderMessage(role, content, animate = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        if (animate) messageDiv.classList.add('animate-slideUp');

        const avatarSvg = role === 'user' 
            ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
            : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>';
        
        const roleName = role === 'user' ? 'You' : 'Unfiltered';

        messageDiv.innerHTML = `
            <div class="message-header">
                <div class="message-avatar">${avatarSvg}</div>
                <span class="message-role">${roleName}</span>
            </div>
            <div class="message-content"></div>
        `;

        const contentDiv = messageDiv.querySelector('.message-content');
        
        if (role === 'assistant') {
            contentDiv.innerHTML = this.parseMarkdown(content);
            this.highlightCode(contentDiv);
            this.addCopyButtons(contentDiv);
        } else {
            contentDiv.textContent = content;
        }

        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    parseMarkdown(text) {
        marked.setOptions({
            highlight: function(code, lang) {
                if (lang && hljs.getLanguage(lang)) {
                    return hljs.highlight(code, { language: lang }).value;
                }
                return hljs.highlightAuto(code).value;
            },
            breaks: true,
            gfm: true
        });
        return marked.parse(text);
    }

    highlightCode(container) {
        container.querySelectorAll('pre code').forEach(block => {
            hljs.highlightElement(block);
        });
    }

    addCopyButtons(container) {
        container.querySelectorAll('pre').forEach(pre => {
            const code = pre.querySelector('code');
            if (!code) return;

            const classes = code.className.split(' ');
            let language = 'code';
            for (const cls of classes) {
                if (cls.startsWith('language-')) {
                    language = cls.replace('language-', '');
                    break;
                }
            }

            const header = document.createElement('div');
            header.className = 'code-header';
            header.innerHTML = `
                <span class="code-language">${language}</span>
                <button class="code-copy">Copy</button>
            `;

            pre.insertBefore(header, code);

            const copyBtn = header.querySelector('.code-copy');
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(code.textContent).then(() => {
                    copyBtn.textContent = 'Copied!';
                    copyBtn.classList.add('copied');
                    setTimeout(() => {
                        copyBtn.textContent = 'Copy';
                        copyBtn.classList.remove('copied');
                    }, 2000);
                });
            });
        });
    }

    showSearchIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'search-indicator';
        indicator.id = 'searchIndicator';
        indicator.innerHTML = `
            <div class="search-indicator-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="2" y1="12" x2="22" y2="12"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
            </div>
            <span class="search-indicator-text">Searching the web...</span>
        `;
        this.messagesContainer.appendChild(indicator);
        this.scrollToBottom();
    }

    hideSearchIndicator() {
        const indicator = document.getElementById('searchIndicator');
        if (indicator) indicator.remove();
    }

    showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'message assistant typing';
        indicator.id = 'typingIndicator';
        indicator.innerHTML = `
            <div class="message-header">
                <div class="message-avatar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                    </svg>
                </div>
                <span class="message-role">Unfiltered</span>
            </div>
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        this.messagesContainer.appendChild(indicator);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) indicator.remove();
    }

    scrollToBottom() {
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    toggleSidebar() {
        this.sidebar.classList.add('open');
        this.sidebarOverlay.classList.add('active');
    }

    closeSidebar() {
        this.sidebar.classList.remove('open');
        this.sidebarOverlay.classList.remove('active');
    }

    openSettings() {
        this.settingsModal.classList.add('active');
    }

    closeSettingsModal() {
        this.settingsModal.classList.remove('active');
    }

    loadSettings() {
        this.apiEndpoint.value = this.settings.apiEndpoint || '';
        this.customInstructions.value = this.settings.customInstructions || '';
        this.aiPreferences.value = this.settings.aiPreferences || '';
    }

    saveSettings() {
        this.settings = {
            apiEndpoint: this.apiEndpoint.value.trim(),
            customInstructions: this.customInstructions.value.trim(),
            aiPreferences: this.aiPreferences.value.trim()
        };
        localStorage.setItem('unfiltered_settings', JSON.stringify(this.settings));
        this.closeSettingsModal();
        this.showToast('Settings saved!');
    }

    clearAllData() {
        if (confirm('Delete all chats and settings? This cannot be undone.')) {
            localStorage.removeItem('unfiltered_chats');
            localStorage.removeItem('unfiltered_settings');
            location.reload();
        }
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 2rem;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #FF8C42, #FF6B35);
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 999px;
            font-weight: 500;
            z-index: 1000;
            animation: slideUp 0.3s ease-out;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
        
        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new UnfilteredAI();
});
