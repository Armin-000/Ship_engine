export function createDom({
  helpUrl = '/docs/help/3D_Model_User_Guide.pdf',
  onReset = null,
  onEmergencyLight = null,
  onLogout = null,
} = {}) {
  const sidebarToggleBtn = document.getElementById('componentToggle');
  const sidebarEl = document.getElementById('componentSidebar');
  const sidebarListEl = document.getElementById('componentList');

  if (!sidebarToggleBtn || !sidebarEl || !sidebarListEl) return null;

  sidebarListEl.innerHTML = '';

  const setToggleVisible = (visible) => {
    sidebarToggleBtn.style.opacity = visible ? '' : '0';
    sidebarToggleBtn.style.pointerEvents = visible ? '' : 'none';
  };

  const isOpen = () => !!sidebarEl.classList.contains('open');

  const openSidebar = () => {
    sidebarEl.classList.add('open');
    sidebarToggleBtn.classList.add('open');
    setToggleVisible(false);
    closeBtn?.focus?.();
  };

  const closeSidebar = () => {
    sidebarEl.classList.remove('open');
    sidebarToggleBtn.classList.remove('open');
    setToggleVisible(true);
    sidebarToggleBtn?.focus?.();
  };

  const header = sidebarEl.querySelector('.component-sidebar-header');
  let closeBtn = header?.querySelector('.component-close') || null;

  if (header && !closeBtn) {
    closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'component-close';
    closeBtn.setAttribute('aria-label', 'Close components');
    closeBtn.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor"
          d="M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7A1 1 0 0 0 5.7 7.1l4.9 4.9-4.9 4.9a1 1 0 1 0 1.4 1.4l4.9-4.9 4.9 4.9a1 1 0 0 0 1.4-1.4L13.4 12l4.9-4.9a1 1 0 0 0 0-1.4z"/>
      </svg>
    `;
    header.appendChild(closeBtn);
  }

  function ensureFooter() {
    const inner = sidebarEl.querySelector('.component-sidebar-inner');
    if (!inner) return null;

    let footer = inner.querySelector('.component-sidebar-footer');
    if (footer) return footer;

    footer = document.createElement('div');
    footer.className = 'component-sidebar-footer';

    footer.innerHTML = `
      <div class="sidebar-footer-actions sidebar-footer-actions--icons">

        <button
          type="button"
          class="sidebar-action sidebar-action--icon sidebar-action--help"
          aria-label="Help"
          title="Help"
        >
          <img
            src="/images/question-svgrepo-com.svg"
            alt=""
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          class="sidebar-action sidebar-action--icon sidebar-action--emergency"
          aria-label="Emergency Light"
          title="Emergency Light"
        >
          <img
            src="/images/light-emergency-on-svgrepo-com.svg"
            alt=""
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          class="sidebar-action sidebar-action--icon sidebar-action--logout"
          aria-label="Logout"
          title="Logout"
        >
          <img
            src="/images/exit-svgrepo-com.svg"
            alt=""
            aria-hidden="true"
          />
        </button>

      </div>
    `;

    inner.appendChild(footer);

    const helpBtn = footer.querySelector('.sidebar-action--help');
    helpBtn?.addEventListener('click', () => {
      window.open(helpUrl, '_blank', 'noopener');
    });

    footer
      .querySelector('.sidebar-action--emergency')
      ?.addEventListener('click', () => {
        if (typeof onEmergencyLight === 'function') {
          onEmergencyLight();
        }
      });

    footer
      .querySelector('.sidebar-action--logout')
      ?.addEventListener('click', () => {
        if (typeof onLogout === 'function') {
          onLogout();
        }
      });

    const globalHelpBtn = document.getElementById('helpBtnGlobal');
    const globalResetBtn = document.getElementById('resetBtnGlobal');

    if (globalHelpBtn) {
      globalHelpBtn.onclick = () => {
        window.open(helpUrl, '_blank', 'noopener');
      };
    }

    if (globalResetBtn) {
      globalResetBtn.onclick = () => {
        if (typeof onReset === 'function') {
          onReset();
        }
      };
    }

    return footer;
  }

  ensureFooter();
  setToggleVisible(true);

  return {
    sidebarToggleBtn,
    sidebarEl,
    sidebarListEl,
    closeBtn,

    helpUrl,
    onReset,
    onEmergencyLight,
    onLogout,

    setToggleVisible,
    isOpen,
    openSidebar,
    closeSidebar,
  };
}