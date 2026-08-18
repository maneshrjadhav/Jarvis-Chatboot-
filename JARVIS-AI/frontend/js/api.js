const JARVISApi = (() => {
  const API_BASE_URL = 'http://127.0.0.1:5000';

  function sanitize(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function sendMessageToJarvis(message) {
    const cleanedPrompt = String(message || '').trim();

    if (!cleanedPrompt) {
      throw new Error('Message is required.');
    }

    let response;
    try {
      response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: cleanedPrompt })
      });
    } catch (networkErr) {
      // Network-level failure (backend unreachable)
      throw new Error('JARVIS is temporarily unavailable. Please try again.');
    }

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.success) {
      // Distinguish backend vs AI processing errors via status code
      if (response.status === 503) {
        throw new Error('JARVIS is temporarily unavailable. Please try again.');
      }
      const errorMessage = payload.error || 'JARVIS could not process your request.';
      throw new Error(errorMessage);
    }

    return {
      content: payload.response,
      model: payload.model || 'JARVIS Advanced'
    };
  }

  async function healthCheck() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/health`);
      if (!res.ok) return { ok: false };
      const payload = await res.json().catch(() => ({}));
      return { ok: !!payload?.success, payload };
    } catch (e) {
      return { ok: false };
    }
  }

  async function sendMessage(prompt) {
    return sendMessageToJarvis(prompt);
  }

  function getSuggestions() {
    return [
      'Build something',
      'Learn something',
      'Analyze files',
      'Plan & create'
    ];
  }

  return {
    sendMessageToJarvis,
    sendMessage,
    getSuggestions,
    sanitize
  };
})();

if (typeof window !== 'undefined') {
  window.JARVISApi = JARVISApi;
}
