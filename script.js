class ChatUI {
    constructor() {
        this.messagesContainer = document.getElementById('chat-messages');
        this.userInput = document.getElementById('user-input');
        this.sendButton = document.getElementById('send-button');
        this.thinkingIndicator = document.getElementById('thinking-indicator');
        this.headerTitle = document.getElementById('header-title');
        
        // チャット履歴を保持する配列
        this.chatHistory = [];
        this.messageCount = 0;  // メッセージカウンター追加

        // マークダウンパーサーの設定
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

        // イベントリスナーの設定
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // ヘッダータイトルクリックで再読み込み
        this.headerTitle.addEventListener('click', () => {
            window.location.reload();
        });
    }

    async sendMessage() {
        const message = this.userInput.value.trim();
        if (!message) return;

        // 考え中の表示を開始
        this.thinkingIndicator.classList.add('visible');

        // メーザーメッセージを表示と履歴に追加
        this.addMessage(message, 'user');
        this.chatHistory.push({ 
            role: 'user', 
            parts: [{ text: message }]
        });

        // 履歴を直近5回分に制限
        if (this.chatHistory.length > 10) { // ユーザーとボットで1往復で2メッセージなので10
            this.chatHistory = this.chatHistory.slice(-10);
        }

        this.userInput.value = '';

        try {
            const response = await this.sendToGemini(message);
            this.addMessage(response, 'bot');
            this.chatHistory.push({ role: 'model', parts: [{ text: response }] });
        } catch (error) {
            console.error('Error:', error);
            this.addMessage('申し訳ありません。エラーが発生しました。', 'bot');
        } finally {
            // 考え中の表示を終了
            this.thinkingIndicator.classList.remove('visible');
        }
    }

    async sendToGemini(message) {
        const API_KEY = 'AIzaSyCpcoEdxRamjbM9k7GKKCBYK8zmNUH20rY';
        const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
        
        const response = await fetch(`${API_URL}?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: this.chatHistory,
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                }
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error?.message || 'APIエラーが発生しました');
        }
        return data.candidates[0].content.parts[0].text;
    }

    addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        
        document.body.classList.add('has-messages');
        
        if (sender === 'bot') {
            messageDiv.innerHTML = marked.parse(content);
            
            // コードブロックにコピーボタンを追加
            messageDiv.querySelectorAll('pre').forEach((pre) => {
                const code = pre.querySelector('code');
                if (code) {
                    const copyButton = document.createElement('button');
                    copyButton.className = 'copy-button';
                    copyButton.textContent = 'コピー';
                    
                    copyButton.addEventListener('click', () => {
                        navigator.clipboard.writeText(code.textContent).then(() => {
                            copyButton.textContent = 'コピー完了!';
                            copyButton.classList.add('copied');
                            setTimeout(() => {
                                copyButton.textContent = 'コピー';
                                copyButton.classList.remove('copied');
                            }, 2000);
                        });
                    });
                    
                    pre.appendChild(copyButton);
                }
            });
            
            // コードブロック内のシンタックスハイライト��適用
            messageDiv.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        } else {
            messageDiv.textContent = content;
        }
        
        this.messagesContainer.appendChild(messageDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    createNewChat() {
        this.chatHistory = [];
        this.messageCount = 0;
        this.messagesContainer.innerHTML = '';
        this.userInput.value = '';
        document.body.classList.remove('has-messages');
    }
}

// チャットUIを初期化
const chat = new ChatUI();