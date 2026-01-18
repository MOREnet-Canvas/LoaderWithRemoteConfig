export function mountAdminPanel() {
    if (!/\/accounts\/\d+\/theme_editor/.test(location.pathname)) return;

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