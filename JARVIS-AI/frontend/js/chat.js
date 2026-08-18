const JARVISChat = (() => {
  const state = {
    messages: [],
    typing: false,
    lastUserPrompt: '',
    isSending: false
  };

  const elements = {
    chatThread: null,
    typingIndicator: null,
    messageInput: null,
    welcomeScreen: null,
    chatForm: null,
    messageCount: null,
    activeModel: null,
    modelSelect: null,
    sidebar: null,
    intelPanel: null,
    panelToggle: null,
    mobileSidebarToggle: null
  };

  function cacheElements() {
    elements.chatThread = document.getElementById('chat-thread');
    elements.typingIndicator = document.getElementById('typing-indicator');
    elements.messageInput = document.getElementById('message-input');
    elements.welcomeScreen = document.getElementById('welcome-screen');
    elements.chatForm = document.getElementById('chat-form');
    elements.messageCount = document.getElementById('message-count');
    elements.activeModel = document.getElementById('active-model');
    elements.modelSelect = document.getElementById('model-select');
    elements.sidebar = document.getElementById('sidebar');
    elements.intelPanel = document.getElementById('intel-panel');
    elements.panelToggle = document.getElementById('panel-toggle');
    elements.mobileSidebarToggle = document.getElementById('mobile-sidebar-toggle');
  }

  function escapeHtml(value) {
    return JARVISApi.sanitize(value);
  }

  function updateMessageCounter() {
    if (elements.messageCount) {
      elements.messageCount.textContent = String(state.messages.length);
    }
  }

  function updateModelLabel() {
    if (elements.modelSelect && elements.activeModel) {
      elements.activeModel.textContent = elements.modelSelect.value;
    }
  }

  function showWelcome() {
    if (!elements.welcomeScreen) {
      return;
    }

    elements.welcomeScreen.classList.remove('hidden', 'fade-out');
    elements.welcomeScreen.setAttribute('aria-hidden', 'false');
  }

  function hideWelcome() {
    if (!elements.welcomeScreen) {
      return;
    }

    elements.welcomeScreen.classList.add('fade-out');
    window.setTimeout(() => {
      elements.welcomeScreen.classList.add('hidden');
      elements.welcomeScreen.setAttribute('aria-hidden', 'true');
    }, 180);
  }

  function autoResizeTextarea() {
    const textarea = elements.messageInput;
    if (!textarea) {
      return;
    }

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }

  function scrollToBottom() {
    if (elements.chatThread) {
      elements.chatThread.scrollTop = elements.chatThread.scrollHeight;
    }
  }

  function setTyping(isTyping) {
    state.typing = isTyping;

    if (elements.typingIndicator) {
      elements.typingIndicator.classList.toggle('hidden', !isTyping);
    }
  }

  function appendMessage(role, text) {
    const safeText = escapeHtml(text);
    const template = `
      <div class="message-row ${role}">
        <article class="message-bubble" data-role="${role}">
          <div class="message-meta">
            <span class="avatar-pill">${role === 'assistant' ? 'J' : 'M'}</span>
            <span class="message-author">${role === 'assistant' ? 'JARVIS' : 'You'}</span>
          </div>
          <div class="message-content">
            <p>${safeText}</p>
          </div>
          ${role === 'assistant' ? `
            <div class="message-actions">
              <button type="button" class="message-action copy-action" aria-label="Copy response">
                <i class="bi bi-clipboard"></i>
              </button>
              <button type="button" class="message-action regenerate-action" aria-label="Regenerate response">
                <i class="bi bi-arrow-clockwise"></i>
              </button>
              <button type="button" class="message-action like-action" aria-label="Like response">
                <i class="bi bi-hand-thumbs-up"></i>
              </button>
              <button type="button" class="message-action dislike-action" aria-label="Dislike response">
                <i class="bi bi-hand-thumbs-down"></i>
              </button>
            </div>
          ` : ''}
        </article>
      </div>
    `;

    elements.chatThread.insertAdjacentHTML('beforeend', template);
    state.messages.push({ role, text, id: Date.now() + Math.random() });
    updateMessageCounter();
    scrollToBottom();
  }

  function setSendingState(sending) {
    state.isSending = !!sending;
    const sendBtn = document.getElementById('send-btn');
    if (sendBtn) sendBtn.disabled = !!sending;
    if (elements.messageInput) elements.messageInput.disabled = !!sending;
  }

  function handleSendMessage(prompt) {
    const trimmed = String(prompt || '').trim();
    if (!trimmed || state.isSending) {
      return;
    }

    state.lastUserPrompt = trimmed;
    hideWelcome();
    appendMessage('user', trimmed);
    elements.messageInput.value = '';
    autoResizeTextarea();
    setTyping(true);
    setSendingState(true);

    JARVISApi.sendMessageToJarvis(trimmed)
      .then((result) => {
        setTyping(false);
        appendMessage('assistant', result.content || 'I am ready to help.');
      })
      .catch((error) => {
        setTyping(false);
        const message = error?.message || 'JARVIS is temporarily unavailable. Please try again.';
        appendMessage('assistant', message);
        // Log technical details to console for debugging (safe: no secrets)
        console.error('Chat error:', error);
      })
      .finally(() => {
        setSendingState(false);
      });
  }

  function handleSuggestionClick(event) {
    const card = event.target.closest('.suggestion-card');
    if (!card) {
      return;
    }

    const query = card.dataset.query || card.textContent.trim();
    handleSendMessage(query);
  }

  function handleMessageActions(event) {
    const copyButton = event.target.closest('.copy-action');
    if (copyButton) {
      const bubble = copyButton.closest('.message-bubble');
      const content = bubble?.querySelector('.message-content p')?.textContent || '';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(content).catch(() => {});
      }
      return;
    }

    const regenerateButton = event.target.closest('.regenerate-action');
    if (regenerateButton) {
      if (state.lastUserPrompt) {
        setTyping(true);
      setSendingState(true);
      JARVISApi.sendMessageToJarvis(state.lastUserPrompt)
        .then((result) => {
          setTyping(false);
          const lastAssistantMessage = elements.chatThread.querySelector('.message-row.assistant:last-of-type .message-content p');
          if (lastAssistantMessage) {
            lastAssistantMessage.textContent = result.content || 'I am ready to help.';
          }
        })
        .catch((error) => {
          setTyping(false);
          const lastAssistantMessage = elements.chatThread.querySelector('.message-row.assistant:last-of-type .message-content p');
          if (lastAssistantMessage) {
            lastAssistantMessage.textContent = error?.message || 'JARVIS is temporarily unavailable. Please try again.';
          }
          console.error('Regenerate error:', error);
        })
        .finally(() => {
          setSendingState(false);
        });
      }
      return;
    }

    const likeButton = event.target.closest('.like-action');
    if (likeButton) {
      likeButton.classList.toggle('active');
      return;
    }

    const dislikeButton = event.target.closest('.dislike-action');
    if (dislikeButton) {
      dislikeButton.classList.toggle('active');
      return;
    }
  }

  function bindEvents() {
    if (elements.chatForm) {
      elements.chatForm.addEventListener('submit', (event) => {
        event.preventDefault();
        handleSendMessage(elements.messageInput.value);
      });
    }

    if (elements.messageInput) {
      elements.messageInput.addEventListener('input', autoResizeTextarea);
      elements.messageInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          elements.chatForm?.requestSubmit();
        }
      });
    }

    document.addEventListener('click', handleSuggestionClick);
    document.addEventListener('click', handleMessageActions);

    if (elements.modelSelect) {
      elements.modelSelect.addEventListener('change', updateModelLabel);
    }

    document.getElementById('new-chat-btn')?.addEventListener('click', clearConversation);
    document.getElementById('search-btn')?.addEventListener('click', () => {
      elements.messageInput?.focus();
    });
    document.getElementById('share-btn')?.addEventListener('click', () => {
      elements.messageInput?.focus();
    });
    document.getElementById('more-btn')?.addEventListener('click', () => {
      elements.messageInput?.focus();
    });
    document.getElementById('voice-btn')?.addEventListener('click', () => {
      elements.messageInput?.focus();
    });
    document.getElementById('attach-btn')?.addEventListener('click', () => {
      elements.messageInput?.focus();
    });

    elements.panelToggle?.addEventListener('click', () => {
      elements.intelPanel?.classList.toggle('collapsed');
    });

    elements.mobileSidebarToggle?.addEventListener('click', () => {
      elements.sidebar?.classList.toggle('open');
    });
  }

  function clearConversation() {
    state.messages = [];
    state.lastUserPrompt = '';
    if (elements.chatThread) {
      elements.chatThread.innerHTML = '';
    }
    updateMessageCounter();
    showWelcome();
    setTyping(false);
  }

  function init() {
    cacheElements();
    updateModelLabel();
    updateMessageCounter();
    bindEvents();
    autoResizeTextarea();
    setTyping(false);
  }

  return {
    init,
    clearConversation,
    sendMessage: handleSendMessage
  };
})();

if (typeof window !== 'undefined') {
  window.JARVISChat = JARVISChat;
}
