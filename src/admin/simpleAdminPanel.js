function injectCustomLoaderConfigLinkPersistent({ url, text }) {
    const FORM_SELECTOR = ".Theme__editor-upload-overrides_form";
    const WRAP_ID = "cg-custom-loader-config-wrap"; // stable id inside the form

    const ensureInjected = () => {
        const form = document.querySelector(FORM_SELECTOR);
        if (!form) return;

        // If the form was re-rendered, our wrap will be gone. Re-add it.
        if (form.querySelector(`#${WRAP_ID}`)) return;

        const wrap = document.createElement("div");
        wrap.id = WRAP_ID;
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
        link.className = "ThemeEditorFileUpload__view-file";

        wrap.appendChild(link);
        form.appendChild(wrap);
    };

    // Run once now
    ensureInjected();

    // Keep it alive across SPA tab switches
    const obs = new MutationObserver(() => ensureInjected());
    obs.observe(document.documentElement, { childList: true, subtree: true });

    // (Optional) expose a stopper if you ever need it
    window.__cgStopConfigLinkObserver = () => obs.disconnect();
}