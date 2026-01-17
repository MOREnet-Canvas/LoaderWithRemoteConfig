(function () {
    // Prevent double-load
    if (window.__CG_BOOTSTRAPPED__) return;
    window.__CG_BOOTSTRAPPED__ = true;

    const host = location.hostname;


    const GH_PAGES_BASE = "https://MOREnet-Canvas.github.io/LoaderWithRemoteConfig";

    // Config file per domain
    const configUrl = `${GH_PAGES_BASE}/config/${host}.json`;

    console.log("[CG] Boot loader starting:", { host, configUrl });

    fetch(configUrl, { cache: "no-store" })
        .then((r) => {
            if (!r.ok) throw new Error(`Config fetch failed: ${r.status} ${r.statusText}`);
            return r.json();
        })
        .then((cfg) => {
            window.CG_CONFIG = cfg; // make it globally available
            console.log("[CG] Config loaded:", cfg);

            if (!cfg.bundleUrl) throw new Error("Config missing bundleUrl");

            const script = document.createElement("script");
            script.id = "cg_app_bundle";
            script.src = cfg.bundleUrl + (cfg.cacheBuster ? `?v=${Date.now()}` : "");
            script.defer = true;
            script.onload = () => console.log("[CG] App bundle loaded");
            script.onerror = () => console.error("[CG] Failed to load app bundle:", script.src);
            document.head.appendChild(script);
        })
        .catch((err) => {
            console.error("[CG] Boot loader failed:", err);
        });
})();