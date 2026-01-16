// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyBEOpODqoBU-cxE7Hczq7oHvI2gHTQ7OLs",
    authDomain: "bookmarklet-23213.firebaseapp.com",
    databaseURL: "https://bookmarklet-23213-default-rtdb.firebaseio.com",
    projectId: "bookmarklet-23213",
    storageBucket: "bookmarklet-23213.firebasestorage.app",
    messagingSenderId: "979434209636",
    appId: "1:979434209636:web:b293cd1ddc6a357e57ba71",
    measurementId: "G-YS4Q3RNGPZ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

class UnfilteredAI {
    constructor() {
        this.chats = [];
        this.currentChatId = null;
        this.settings = {};
        this.memories = [];
        this.isProcessing = false;
        this.userId = this.getOrCreateUserId();
        this.apiUrl = 'https://unfiltered-ai.modmojheh.workers.dev';
        this.init();
    }

    getOrCreateUserId() {
        let id = localStorage.getItem('unfiltered_user_id');
        if (!id) {
            id = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('unfiltered_user_id', id);
        }
        return id;
    }

    async init() {
        this.bindElements();
        this.bindEvents();
        await this.loadFromFirebase();
        this.setupRealtimeListeners();
        this.renderChatList();
        if (this.chats.length > 0) {
            this.loadChat(this.chats[0].id);
        }
    }

    setupRealtimeListeners() {
        // Real-time listener for chats
        db.ref(`users/${this.userId}/chats`).on('value', (snapshot) => {
            const chatsData = snapshot.val();
            if (chatsData) {
                this.chats = Object.values(chatsData).sort((a, b) => 
                    new Date(b.createdAt) - new Date(a.createdAt)
                );
            } else {
                this.chats = [];
            }
            this.renderChatList();
        });

        // Real-time listener for memories
        db.ref(`users/${this.userId}/memories`).on('value', (snapshot) => {
            const memoriesData = snapshot.val();
            if (memoriesData) {
                this.memories = Object.values(memoriesData).sort((a, b) => 
                    new Date(b.createdAt) - new Date(a.createdAt)
                );
            } else {
                this.memories = [];
            }
            // Update memory list if settings modal is open on memory tab
            if (this.settingsModal.classList.contains('active') && 
                document.getElementById('memoryPanel').classList.contains('active')) {
                this.renderMemoryList();
            }
        });

        // Real-time listener for settings
        db.ref(`users/${this.userId}/settings`).on('value', (snapshot) => {
            const settingsData = snapshot.val();
            if (settingsData) {
                this.settings = settingsData;
            }
        });
    }

    async loadFromFirebase() {
        try {
            // Load chats
            const chatsSnapshot = await db.ref(`users/${this.userId}/chats`).once('value');
            const chatsData = chatsSnapshot.val();
            if (chatsData) {
                this.chats = Object.values(chatsData).sort((a, b) => 
                    new Date(b.createdAt) - new Date(a.createdAt)
                );
            }

            // Load settings
            const settingsSnapshot = await db.ref(`users/${this.userId}/settings`).once('value');
            const settingsData = settingsSnapshot.val();
            if (settingsData) {
                this.settings = settingsData;
                this.loadSettingsToUI();
            }

            // Load memories
            const memoriesSnapshot = await db.ref(`users/${this.userId}/memories`).once('value');
            const memoriesData = memoriesSnapshot.val();
            if (memoriesData) {
                this.memories = Object.values(memoriesData).sort((a, b) => 
                    new Date(b.createdAt) - new Date(a.createdAt)
                );
            }
        } catch (e) {
            console.log('Firebase load error, using local:', e);
            this.chats = JSON.parse(localStorage.getItem('unfiltered_chats') || '[]');
            this.settings = JSON.parse(localStorage.getItem('unfiltered_settings') || '{}');
            this.memories = JSON.parse(localStorage.getItem('unfiltered_memories') || '[]');
        }
    }

    async saveToFirebase() {
        try {
            // Save chats
            const chatsObj = {};
            this.chats.forEach(chat => { chatsObj[chat.id] = chat; });
            await db.ref(`users/${this.userId}/chats`).set(chatsObj);

            // Save settings
            await db.ref(`users/${this.userId}/settings`).set(this.settings);

            // Save memories
            const memoriesObj = {};
            this.memories.forEach(mem => { memoriesObj[mem.id] = mem; });
            await db.ref(`users/${this.userId}/memories`).set(memoriesObj);
        } catch (e) {
            console.log('Firebase save error:', e);
        }
        // Also save locally as backup
        localStorage.setItem('unfiltered_chats', JSON.stringify(this.chats));
        localStorage.setItem('unfiltered_settings', JSON.stringify(this.settings));
        localStorage.setItem('unfiltered_memories', JSON.stringify(this.memories));
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
        this.customInstructions = document.getElementById('customInstructions');
        this.responseStyle = document.getElementById('responseStyle');
        this.codeStyle = document.getElementById('codeStyle');
        this.saveSettingsBtn = document.getElementById('saveSettings');
        this.clearAllDataBtn = document.getElementById('clearAllData');
        this.clearAllMemoryBtn = document.getElementById('clearAllMemory');
        this.memoryList = document.getElementById('memoryList');
        this.settingsTabs = document.querySelectorAll('.settings-tab');
        this.settingsPanels = document.querySelectorAll('.settings-panel');
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
        this.clearAllMemoryBtn.addEventListener('click', () => this.clearAllMemories());
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) this.closeSettingsModal();
        });

        // Settings tabs
        this.settingsTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.settingsTabs.forEach(t => t.classList.remove('active'));
                this.settingsPanels.forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(tabName + 'Panel').classList.add('active');
                if (tabName === 'memory') {
                    this.renderMemoryList();
                }
            });
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
        this.saveToFirebase();
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

    async deleteChat(chatId) {
        if (confirm('Delete this chat?')) {
            this.chats = this.chats.filter(c => c.id !== chatId);
            try {
                await db.ref(`users/${this.userId}/chats/${chatId}`).remove();
            } catch (e) {}
            this.saveToFirebase();
            this.renderChatList();
            if (this.currentChatId === chatId) {
                this.newChat();
            }
        }
    }

    renderChatList() {
        this.chatList.innerHTML = this.chats.map(chat => `
            <div class="chat-item ${chat.id === this.currentChatId ? 'active' : ''}" data-id="${chat.id}">
                <span class="chat-item-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                </span>
                <div class="chat-item-content">
                    <div class="chat-item-title">${this.escapeHtml(chat.title)}</div>
                    <div class="chat-item-date">${this.formatDate(chat.createdAt)}</div>
                </div>
                <button class="chat-item-delete" title="Delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
        if (!chat.messages) chat.messages = [];
        const isFirstMessage = chat.messages.length === 0;
        const webSearchEnabled = this.webSearchToggle.checked;

        chat.messages.push({ role: 'user', content });
        this.renderMessage('user', content);
        this.saveToFirebase();

        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';
        this.sendBtn.disabled = true;

        if (webSearchEnabled) {
            this.showSearchIndicator();
        }

        this.showTypingIndicator();

        try {
            // Build custom instructions
            let customInstructions = this.settings.customInstructions || '';
            if (this.settings.responseStyle) {
                const styles = {
                    concise: 'Be very concise and direct. Short sentences.',
                    detailed: 'Provide thorough, detailed explanations.',
                    casual: 'Be casual and friendly, like talking to a friend.',
                    professional: 'Maintain a professional, formal tone.'
                };
                customInstructions += '\n' + (styles[this.settings.responseStyle] || '');
            }
            if (this.settings.codeStyle) {
                const codeStyles = {
                    minimal: 'When writing code, do not include comments.',
                    verbose: 'When writing code, include detailed comments explaining each section.'
                };
                customInstructions += '\n' + (codeStyles[this.settings.codeStyle] || '');
            }

            const response = await fetch(`${this.apiUrl}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: chat.messages,
                    generateTitle: isFirstMessage,
                    customInstructions: customInstructions.trim() || undefined,
                    webSearch: webSearchEnabled,
                    searchQuery: content,
                    memories: (this.memories || []).map(m => m.content)
                })
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            this.hideSearchIndicator();
            this.hideTypingIndicator();

            // Handle memory save
            if (data.memoryToSave) {
                await this.addMemory(data.memoryToSave);
                this.showMemorySavedIndicator();
            }

            const reply = data.reply || 'Sorry, I could not generate a response.';
            chat.messages.push({ role: 'assistant', content: reply });
            this.renderMessage('assistant', reply);

            if (data.title && isFirstMessage) {
                chat.title = data.title;
                this.renderChatList();
            }

            this.saveToFirebase();

        } catch (error) {
            console.error('Error:', error);
            this.hideSearchIndicator();
            this.hideTypingIndicator();
            this.renderMessage('assistant', `Error: ${error.message}`);
        }

        this.isProcessing = false;
        this.scrollToBottom();
    }

    renderMessage(role, content, animate = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;

        const avatarSvg = role === 'user' 
            ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
            : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>';
        
        const roleName = role === 'user' ? 'You' : 'Unfiltered';

        messageDiv.innerHTML = `
            <div class="message-inner">
                <div class="message-avatar">${avatarSvg}</div>
                <div class="message-body">
                    <div class="message-role">${roleName}</div>
                    <div class="message-content"></div>
                    <div class="message-actions">
                        <button class="action-btn copy-btn" title="Copy">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            Copy
                        </button>
                    </div>
                </div>
            </div>
        `;

        const contentDiv = messageDiv.querySelector('.message-content');
        
        if (role === 'assistant') {
            contentDiv.innerHTML = this.parseMarkdown(content);
            this.highlightCode(contentDiv);
            this.addCopyButtons(contentDiv);
            this.fixLinks(contentDiv);
        } else {
            contentDiv.textContent = content;
        }

        // Add copy message button handler
        const copyBtn = messageDiv.querySelector('.copy-btn');
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(content).then(() => {
                copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied';
                setTimeout(() => {
                    copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy';
                }, 2000);
            });
        });

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

    // Make all links open in new tab
    fixLinks(container) {
        container.querySelectorAll('a').forEach(link => {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
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
                <button class="code-copy">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Copy
                </button>
            `;

            pre.insertBefore(header, code);

            const copyBtn = header.querySelector('.code-copy');
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(code.textContent).then(() => {
                    copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
                    copyBtn.classList.add('copied');
                    setTimeout(() => {
                        copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy';
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
            <div class="search-indicator-inner">
                <div class="message-avatar" style="background: var(--bg-input); border: 1px solid var(--border);">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                    </svg>
                </div>
                <div class="search-indicator-content">
                    <div class="search-indicator-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="2" y1="12" x2="22" y2="12"/>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                        </svg>
                    </div>
                    <span class="search-indicator-text">Searching the web...</span>
                </div>
            </div>
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
        indicator.className = 'typing-message';
        indicator.id = 'typingIndicator';
        indicator.innerHTML = `
            <div class="typing-inner">
                <div class="message-avatar" style="background: var(--bg-input); border: 1px solid var(--border);">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                    </svg>
                </div>
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
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
        this.loadSettingsToUI();
        this.settingsModal.classList.add('active');
    }

    closeSettingsModal() {
        this.settingsModal.classList.remove('active');
    }

    loadSettingsToUI() {
        this.customInstructions.value = this.settings.customInstructions || '';
        this.responseStyle.value = this.settings.responseStyle || '';
        this.codeStyle.value = this.settings.codeStyle || '';
    }

    async saveSettings() {
        this.settings = {
            customInstructions: this.customInstructions.value.trim(),
            responseStyle: this.responseStyle.value,
            codeStyle: this.codeStyle.value
        };
        await this.saveToFirebase();
        this.closeSettingsModal();
        this.showToast('Settings saved!');
    }

    async clearAllData() {
        if (confirm('Delete all chats, settings and memories? This cannot be undone.')) {
            try {
                await db.ref(`users/${this.userId}`).remove();
            } catch (e) {}
            localStorage.removeItem('unfiltered_chats');
            localStorage.removeItem('unfiltered_settings');
            localStorage.removeItem('unfiltered_memories');
            location.reload();
        }
    }

    // Memory Management
    async addMemory(content) {
        const memory = {
            id: Date.now().toString(),
            content: content,
            createdAt: new Date().toISOString()
        };
        this.memories.unshift(memory);
        await this.saveToFirebase();
    }

    async deleteMemory(memoryId) {
        this.memories = this.memories.filter(m => m.id !== memoryId);
        try {
            await db.ref(`users/${this.userId}/memories/${memoryId}`).remove();
        } catch (e) {}
        await this.saveToFirebase();
        this.renderMemoryList();
    }

    async clearAllMemories() {
        if (confirm('Delete all saved memories? This cannot be undone.')) {
            this.memories = [];
            try {
                await db.ref(`users/${this.userId}/memories`).remove();
            } catch (e) {}
            localStorage.removeItem('unfiltered_memories');
            this.renderMemoryList();
            this.showToast('All memories cleared');
        }
    }

    renderMemoryList() {
        if (this.memories.length === 0) {
            this.memoryList.innerHTML = '<div class="memory-empty">No memories saved yet. Tell the AI to "remember" something!</div>';
            return;
        }

        this.memoryList.innerHTML = this.memories.map(mem => `
            <div class="memory-item" data-id="${mem.id}">
                <div class="memory-item-content">
                    <div class="memory-item-text">${this.escapeHtml(mem.content)}</div>
                    <div class="memory-item-date">${this.formatDate(mem.createdAt)}</div>
                </div>
                <button class="memory-item-delete" title="Delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                </button>
            </div>
        `).join('');

        this.memoryList.querySelectorAll('.memory-item-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const memoryId = e.target.closest('.memory-item').dataset.id;
                this.deleteMemory(memoryId);
            });
        });
    }

    showMemorySavedIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'memory-saved-indicator';
        indicator.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/>
                <path d="M12 6v6l4 2"/>
            </svg>
            <span>Saved to memory</span>
        `;
        this.messagesContainer.appendChild(indicator);
        this.scrollToBottom();
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
            padding: 0.65rem 1.25rem;
            border-radius: 999px;
            font-weight: 500;
            font-size: 0.9rem;
            z-index: 1000;
            animation: fadeIn 0.2s ease-out;
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
