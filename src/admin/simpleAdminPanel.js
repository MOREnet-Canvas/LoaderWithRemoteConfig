export function mountAdminPanel() {
    if (!/\/accounts\/\d+\/theme_editor/.test(location.pathname)) return;

    // Inject the link at the bottom of the Upload Overrides form
    injectCustomLoaderConfigLink({
        // Prefer config-driven URL, with a safe fallback
        url: window.CG_CONFIG?.adminConfigUrl || "https://your-domain.example/custom-loader-config",
        text: "Custom Loader Config",
    });

    const panel = document.createElement("div");
    panel.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    width: 320px;
    background: #fff;
    border: 1px solid #ccc;
    z-index: 999999;
    font-family: sans-serif;
    box-shadow: 0 4px 12px rgba(0,0,0,.2);
  `;

    panel.innerHTML = `
    <div style="padding:10px;font-weight:bold;border-bottom:1px solid #ddd">
      Custom Loader Config
    </div>

    <div style="padding:10px">
      <label>Remote App URL</label>
      <input id="appUrl" style="width:100%" value="https://your-org.github.io/canvas-tools/app.js" />

      <label style="margin-top:10px;display:block">Extra JS (optional)</label>
      <textarea id="extraJs" style="width:100%;height:80px"></textarea>

      <button id="download" style="margin-top:10px;width:100%">
        Download Loader.js
      </button>
    </div>
  `;

    panel.querySelector("#download").onclick = () => {
        const appUrl = panel.querySelector("#appUrl").value.trim();
        const extraJs = panel.querySelector("#extraJs").value;

        const loader = `
(function () {
  if (window.__CUSTOM_LOADER__) return;
  window.__CUSTOM_LOADER__ = true;

  ${extraJs}

  var s = document.createElement("script");
  s.src = "${appUrl}";
  s.defer = true;
  document.head.appendChild(s);
})();
`;

        const blob = new Blob([loader], { type: "text/javascript" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "loader.js";
        a.click();
    };

    document.body.appendChild(panel);
}

/**
 * Adds a link at the bottom of:
 *   .Theme__editor-upload-overrides_form
 */
function injectCustomLoaderConfigLink({ url, text }) {
    const FORM_SELECTOR = ".Theme__editor-upload-overrides_form";
    const DATA_KEY = "cgCustomLoaderConfigLinkInjected";

    const tryInject = () => {
        const form = document.querySelector(FORM_SELECTOR);
        if (!form) return false;
        if (form.dataset[DATA_KEY] === "true") return true;

        const wrap = document.createElement("div");
        wrap.style.marginTop = "12px";
        wrap.style.paddingTop = "12px";
        wrap.style.borderTop = "1px solid rgba(0,0,0,0.1)";
        wrap.style.display = "flex";
        wrap.style.justifyContent = "flex-end";

        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = text;

        // Looks like Canvas' existing "View File" link style
        link.className = "ThemeEditorFileUpload__view-file";

        wrap.appendChild(link);
        form.appendChild(wrap);

        form.dataset[DATA_KEY] = "true";
        return true;
    };

    if (tryInject()) return;

    const obs = new MutationObserver(() => {
        if (tryInject()) obs.disconnect();
    });

    obs.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => obs.disconnect(), 30000);
}