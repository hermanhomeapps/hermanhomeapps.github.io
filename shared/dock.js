/*
  HermanHomeApps — shared navigation dock
  ------------------------------------------
  Drop this ONE line near the end of any app's <body>, right before the
  closing </body> tag:

    <script src="https://hermanhomeapps.github.io/shared/dock.js"></script>

  That's it — no HTML or CSS to copy into the app itself. This script
  injects its own <style> tag and builds the floating dock at runtime.

  To change what's in the dock (e.g. add a third icon later), edit ONLY
  this file. Every app that includes the script tag above picks up the
  change automatically on their next page load — nothing to touch in the
  individual app files.

  Colors are hardcoded here on purpose (not using var(--ink) etc.) so this
  works correctly even in an app that doesn't define the usual house CSS
  variables.
*/
(function () {
  var DOCK_CSS =
    '.hha-dock-wrap{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:200;}' +
    '.hha-dock{display:flex;gap:10px;align-items:center;padding:9px 14px;border-radius:20px;' +
    'background:rgba(255,255,255,0.75);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);' +
    'border:1px solid rgba(255,255,255,0.5);box-shadow:0 10px 30px rgba(0,0,0,0.18);font-family:"Inter",sans-serif;}' +
    '.hha-dock-btn{position:relative;width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;' +
    'background:transparent;border:none;cursor:pointer;text-decoration:none;color:#565C77;' +
    'transition:transform .25s cubic-bezier(.34,1.56,.64,1),color .2s ease,background .2s ease;}' +
    '.hha-dock-btn svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}' +
    '.hha-dock-btn:hover,.hha-dock-btn:focus-visible{transform:translateY(-5px) scale(1.1);color:#FF6B5B;background:rgba(255,107,91,.12);outline:none;}' +
    '.hha-dock-tooltip{position:absolute;bottom:calc(100% + 10px);left:50%;transform:translateX(-50%) translateY(6px) scale(.9);' +
    'background:#262A3F;color:#fff;font-size:.7rem;font-weight:600;padding:5px 10px;border-radius:8px;white-space:nowrap;' +
    'opacity:0;pointer-events:none;transition:opacity .25s ease,transform .25s cubic-bezier(.34,1.56,.64,1);}' +
    '.hha-dock-btn:hover .hha-dock-tooltip,.hha-dock-btn:focus-visible .hha-dock-tooltip{opacity:1;transform:translateX(-50%) translateY(0) scale(1);}' +
    '@media (prefers-reduced-motion: reduce){.hha-dock-btn,.hha-dock-tooltip{transition:none;}}';

  var HUB_URL = 'https://hermanhomeapps.github.io/';
  var NEW_APP_URL = 'https://hermanhomeapps.github.io/new-app/index.html';

  // Add more { href, label, svg } entries here as the hub grows —
  // every app using the shared script picks up new icons automatically.
  var DOCK_ITEMS = [
    {
      href: HUB_URL,
      label: 'Home',
      svg: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9"/>'
    },
    {
      href: NEW_APP_URL,
      label: 'New App',
      svg: '<path d="M12 5v14M5 12h14"/>'
    }
  ];

  function buildDock() {
    var wrap = document.createElement('div');
    wrap.className = 'hha-dock-wrap';

    var dock = document.createElement('div');
    dock.className = 'hha-dock';

    DOCK_ITEMS.forEach(function (item) {
      var a = document.createElement('a');
      a.className = 'hha-dock-btn';
      a.href = item.href;
      a.setAttribute('aria-label', item.label);
      a.innerHTML =
        '<span class="hha-dock-tooltip">' + item.label + '</span>' +
        '<svg viewBox="0 0 24 24">' + item.svg + '</svg>';
      dock.appendChild(a);
    });

    wrap.appendChild(dock);
    return wrap;
  }

  function mount() {
    var styleEl = document.createElement('style');
    styleEl.textContent = DOCK_CSS;
    document.head.appendChild(styleEl);
    document.body.appendChild(buildDock());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
