// Add this to a new file: public/js/chat.js

class ChatWidget {
  constructor() {
    this.conversationHistory = [];
    this.isOpen = false;
    this.isLoading = false;
    this.init();
  }

  init() {
    this.createWidget();
    this.attachEventListeners();
  }

  createWidget() {
    // Simply add the chat sidebar to the body without restructuring existing DOM
    const widgetHTML = `
      <div class="chat-sidebar hidden" id="chatSidebar">
        <div class="chat-resize-handle" id="chatResizeHandle"></div>
        <div class="chat-widget">
          <div class="chat-container open" id="chatContainer">
            <div class="chat-header" style="font-weight: normal; font-family: Roboto, sans-serif;">
              ChatGPT
            </div>
            <div class="chat-messages" id="chatMessages">
              <div class="message assistant-message">
                Hi! I'm here to help you solve the reading comprehension problem. Feel free to ask me any questions!
              </div>
            </div>
            <div class="chat-input-container">
              <input type="text" class="chat-input" id="chatInput" placeholder="Ask anything" />
              <button class="chat-send" id="chatSend" aria-label="Send" title="Send" aria-live="off">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M12 3l4.5 4.5-1.4 1.4L13 6.8V20h-2V6.8L8.9 8.9 7.5 7.5 12 3z" fill="currentColor"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', widgetHTML);
    // Restore saved width if available
    const savedWidth = parseInt(localStorage.getItem('chatSidebarWidth'), 10);
    if (!isNaN(savedWidth) && savedWidth > 0) {
      const sidebar = document.getElementById('chatSidebar');
      if (sidebar) sidebar.style.width = savedWidth + 'px';
    }
    // Do not enable split-screen by default; it will be toggled on experiment pages only
  }

  attachEventListeners() {
    const input = document.getElementById('chatInput');
    const send = document.getElementById('chatSend');
    const sidebar = document.getElementById('chatSidebar');
    const handle = document.getElementById('chatResizeHandle');

    send.addEventListener('click', () => this.sendMessage());
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Handle window resize to adjust margin dynamically
    window.addEventListener('resize', () => {
      if (document.body.classList.contains('split-screen-layout')) {
        const width = sidebar ? parseInt(getComputedStyle(sidebar).width, 10) : Math.round(window.innerWidth * 0.4);
        this.updateSplitLayoutMargin(width);
      }
    });

    // Draggable resize for sidebar
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    const onMouseMove = (e) => {
      if (!isResizing || !sidebar) return;
      const dx = startX - e.clientX; // dragging left increases width
      let newWidth = startWidth + dx;
      const minWidth = 260;
      const maxWidth = 700;
      if (newWidth < minWidth) newWidth = minWidth;
      if (newWidth > maxWidth) newWidth = maxWidth;
      sidebar.style.width = newWidth + 'px';
      // Sync main content margin
      this.updateSplitLayoutMargin(newWidth);
    };

    const onMouseUp = () => {
      if (!isResizing) return;
      isResizing = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      // Persist width
      const currentWidth = sidebar ? parseInt(getComputedStyle(sidebar).width, 10) : null;
      if (currentWidth) {
        try { localStorage.setItem('chatSidebarWidth', String(currentWidth)); } catch (_) {}
      }
    };

    if (handle) {
      handle.addEventListener('mousedown', (e) => {
        if (!sidebar) return;
        isResizing = true;
        startX = e.clientX;
        startWidth = parseInt(getComputedStyle(sidebar).width, 10);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        e.preventDefault();
      });
    }
  }

  hideChat() {
    const sidebar = document.getElementById('chatSidebar');
    if (sidebar) {
      sidebar.classList.add('hidden');
    }
    document.body.classList.remove('split-screen-layout');
    // Clear inline margin so content uses full width
    document.body.style.marginRight = '';
  }

  showChat() {
    const sidebar = document.getElementById('chatSidebar');
    if (sidebar) {
      sidebar.classList.remove('hidden');
    }
    document.body.classList.add('split-screen-layout');
    // Apply margin to match current width (default to 40vw if not found)
    const width = sidebar ? parseInt(getComputedStyle(sidebar).width, 10) : Math.round(window.innerWidth * 0.4);
    this.updateSplitLayoutMargin(width);
    // Reset chat for new problem
    this.clear();
  }

  async sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message || this.isLoading) return;

    // Clear input and add user message
    input.value = '';
    this.addMessage(message, 'user');
    
    // Show typing indicator
    this.showTypingIndicator();
    this.isLoading = true;
    document.getElementById('chatSend').disabled = true;

    try {
      const response = await fetch('/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          conversationHistory: this.conversationHistory,
          puzzleContext: (typeof window.getReadingChatContext === 'function') ? window.getReadingChatContext() : null
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        this.conversationHistory = data.conversationHistory;
        this.removeTypingIndicator();
        this.addMessage(data.message, 'assistant');
      } else {
        this.removeTypingIndicator();
        this.addMessage('Sorry, I encountered an error. Please try again.', 'assistant');
      }
    } catch (error) {
      console.error('Chat error:', error);
      this.removeTypingIndicator();
      this.addMessage('Sorry, I encountered an error. Please try again.', 'assistant');
    } finally {
      this.isLoading = false;
      document.getElementById('chatSend').disabled = false;
    }
  }

  clear() {
    // Reset conversation state and clear rendered messages
    this.conversationHistory = [];
    this.isLoading = false;
    const messagesContainer = document.getElementById('chatMessages');
    const input = document.getElementById('chatInput');
    const send = document.getElementById('chatSend');
    if (messagesContainer) {
      messagesContainer.innerHTML = '';
      const greeting = document.createElement('div');
      greeting.className = 'message assistant-message';
      greeting.textContent = "Hi! I'm here to help you solve the reading comprehension problem. I can already see the text and the question. Feel free to ask me for hints or answers!";
      messagesContainer.appendChild(greeting);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    if (input) input.value = '';
    if (send) send.disabled = false;
    this.removeTypingIndicator();
  }

  updateSplitLayoutMargin(widthPx) {
    // Keep main content from being covered by the sidebar
    // On mobile (< 768px), let CSS handle the layout instead
    if (window.innerWidth <= 768) {
      document.body.style.marginRight = '';
      return;
    }
    // Default to 40vw if no width provided
    const defaultWidth = Math.round(window.innerWidth * 0.4);
    document.body.style.marginRight = (widthPx || defaultWidth) + 'px';
  }

  parseMarkdown(text) {
    // Simple markdown parser for common formatting
    let html = text;
    
    // Escape HTML tags to prevent XSS
    html = html.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;');
    
    // Bold: **text** or __text__
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    
    // Italic: *text* or _text_ (but not inside words)
    html = html.replace(/\*([^\s*][^*]*[^\s*])\*/g, '<em>$1</em>');
    html = html.replace(/\b_([^\s_][^_]*[^\s_])_\b/g, '<em>$1</em>');
    
    // Inline code: `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    
    return html;
  }

  addMessage(content, type) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    // Parse markdown for assistant messages, keep plain text for user messages
    if (type === 'assistant') {
      messageDiv.innerHTML = this.parseMarkdown(content);
    } else {
      messageDiv.textContent = content;
    }
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Log chat messages to problem-specific chat logs for database storage
    if (typeof window.logChatMessage === 'function') {
      window.logChatMessage({
        timestamp: new Date().toISOString(),
        sender: type === 'user' ? 'user' : 'assistant',
        message: content
      });
    }
  }

  showTypingIndicator() {
    const messagesContainer = document.getElementById('chatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
      <div class="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
    
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
      indicator.remove();
    }
  }
}

// Initialize chat widget when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.chatWidget = new ChatWidget();
  
  // Make chatLogs available globally if it doesn't exist
  if (typeof window.chatLogs === 'undefined') {
    window.chatLogs = [];
  }
  
  // Make chat widget functions available globally for logging hooks
  window.sendChatMessage = function(message) {
    // This function is called by the logging hooks in the experiment page
    return Promise.resolve();
  };
  
  window.receiveChatResponse = function(response) {
    // This function is called by the logging hooks in the experiment page
    return Promise.resolve();
  };
});