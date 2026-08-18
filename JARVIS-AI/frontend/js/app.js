const JARVISApp = (() => {
  function enableKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      const target = event.target;
      const isTextInput = target && (
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'INPUT' ||
        target.isContentEditable
      );

      if (event.key === 'Escape' && !isTextInput) {
        document.getElementById('intel-panel')?.classList.add('collapsed');
      }

      if (event.key.toLowerCase() === 'n' && !event.ctrlKey && !event.metaKey && !event.altKey && !isTextInput) {
        event.preventDefault();
        JARVISChat.clearConversation();
      }
    });
  }

  function setupSidebarBehavior() {
    const sidebar = document.getElementById('sidebar');
    const mobileToggle = document.getElementById('mobile-sidebar-toggle');

    if (!sidebar || !mobileToggle) {
      return;
    }

    document.addEventListener('click', (event) => {
      const clickedInsideSidebar = sidebar.contains(event.target);
      const clickedToggle = mobileToggle.contains(event.target);

      if (window.innerWidth <= 920 && !clickedInsideSidebar && !clickedToggle) {
        sidebar.classList.remove('open');
      }
    });
  }

  async function init() {
    JARVISChat.init();
    enableKeyboardShortcuts();
    setupSidebarBehavior();

    // Run a health check and update the UI indicator
    try {
      const statusEl = document.querySelector('.online-status');
      const result = await (window.JARVISApi?.healthCheck?.() ?? Promise.resolve({ ok: false }));
      if (statusEl) {
        if (result.ok) {
          statusEl.textContent = 'JARVIS Online';
          statusEl.classList.add('online');
        } else {
          statusEl.textContent = 'Backend Offline';
          statusEl.classList.remove('online');
        }
      }
    } catch (e) {
      console.error('Health check failed', e);
    }
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  JARVISApp.init();
});
