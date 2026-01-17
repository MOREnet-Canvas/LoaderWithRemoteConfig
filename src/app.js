// Simple proof-of-life app
(function () {
    const cfg = window.CG_CONFIG || {};
    console.log("[CG] App running with config:", cfg);

    // Tiny UI indicator so you can confirm it ran
    const badge = document.createElement("div");
    badge.textContent = `CG Loaded: ${cfg.instanceName || "Unknown instance"}`;
    badge.style.position = "fixed";
    badge.style.bottom = "12px";
    badge.style.right = "12px";
    badge.style.zIndex = "999999";
    badge.style.padding = "8px 10px";
    badge.style.borderRadius = "10px";
    badge.style.fontSize = "12px";
    badge.style.background = "white";
    badge.style.border = "1px solid #ccc";
    badge.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
    document.body.appendChild(badge);
})();