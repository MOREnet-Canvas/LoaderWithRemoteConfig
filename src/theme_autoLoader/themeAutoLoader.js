(async function () {
    const ACCOUNT_ID = 1;

    // Give it a name so it doesn’t get treated like “default template” in weird cases
    const THEME_NAME = "Starting Over (CG Dev)";

    // Put your real loader contents here
    const NEW_LOADER_JS = `/* Applied loader test */
console.log("APPLIED loader uploaded", new Date().toISOString());
`;

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    // CSRF from cookie
    const m = document.cookie.match(/(?:^|;\s*)_csrf_token=([^;]+)/);
    const csrf = m ? decodeURIComponent(m[1]) : null;
    if (!csrf) return console.error("No _csrf_token cookie found.");

    // ------------------------------------------------------------------
    // 0) MUST run from /accounts/1/brand_configs so we can discover theme id
    // ------------------------------------------------------------------
    const activeMd5 = window.ENV?.active_brand_config?.md5;
    const sharedThemes = window.ENV?.brandConfigStuff?.sharedBrandConfigs;

    if (!activeMd5) {
        console.error("No ENV.active_brand_config.md5 found. Run this from /accounts/1/brand_configs.");
        return;
    }
    if (!Array.isArray(sharedThemes)) {
        console.error("No ENV.brandConfigStuff.sharedBrandConfigs found. Run this from /accounts/1/brand_configs.");
        return;
    }

    const theme = sharedThemes.find(
        (t) => t.brand_config_md5 === activeMd5 || t.brand_config?.md5 === activeMd5
    );

    if (!theme?.id) {
        console.error("Could not match active md5 to a shared_brand_config id.", { activeMd5, theme });
        return;
    }

    const SHARED_BRAND_CONFIG_ID = theme.id;
    console.log("Active md5:", activeMd5);
    console.log("Matched theme:", theme);
    console.log("✅ SHARED_BRAND_CONFIG_ID =", SHARED_BRAND_CONFIG_ID);

    // ------------------------------------------------------------------
    // 1) Get the full current brand config payload (variables + overrides)
    //    Prefer active_brand_config from ENV on this page.
    // ------------------------------------------------------------------
    const current = window.ENV?.active_brand_config;
    if (!current?.variables) {
        console.error("ENV.active_brand_config.variables missing. Aborting to avoid wiping theme.");
        return;
    }

    const currentVars = current.variables;
    const currentOverrides = {
        css_overrides: current.css_overrides || "",
        mobile_js_overrides: current.mobile_js_overrides || "",
        mobile_css_overrides: current.mobile_css_overrides || "",
    };

    // ------------------------------------------------------------------
    // 2) UPLOAD new brand_config (creates new md5 + uploads file)
    // ------------------------------------------------------------------
    const uploadUrl = `/accounts/${ACCOUNT_ID}/brand_configs`;

    const fdUpload = new FormData();
    for (const [k, v] of Object.entries(currentVars)) {
        fdUpload.append(`brand_config[variables][${k}]`, String(v ?? ""));
    }
    fdUpload.append("css_overrides", currentOverrides.css_overrides);
    fdUpload.append("mobile_js_overrides", currentOverrides.mobile_js_overrides);
    fdUpload.append("mobile_css_overrides", currentOverrides.mobile_css_overrides);
    fdUpload.append("js_overrides", new File([NEW_LOADER_JS], "loader.js", { type: "text/javascript" }));

    const upResp = await fetch(uploadUrl, {
        method: "POST",
        headers: {
            accept: "application/json+canvas-string-ids, application/json",
            "x-csrf-token": csrf,
            "x-requested-with": "XMLHttpRequest",
        },
        body: fdUpload,
        credentials: "same-origin",
    });

    const upJson = await upResp.json().catch(() => null);
    if (!upJson) return console.error("Upload: could not parse JSON response.");

    const newMd5 = upJson?.brand_config?.md5;
    const jsUrl = upJson?.brand_config?.js_overrides;
    const progressUrl = upJson?.progress?.url;

    console.log("Upload status:", upResp.status);
    console.log("New md5:", newMd5);
    console.log("New js_overrides URL:", jsUrl);
    console.log("Upload progress URL:", progressUrl);

    if (!newMd5 || !jsUrl || !progressUrl) {
        console.error("Upload response missing md5/js_overrides/progressUrl", upJson);
        return;
    }

    // Wait for upload sync to complete
    for (let i = 0; i < 60; i++) {
        const p = await fetch(progressUrl, { credentials: "same-origin" }).then((r) => r.json());
        console.log("[Upload progress]", p.workflow_state, p.completion, p.message || "");
        if (p.workflow_state === "completed") break;
        if (p.workflow_state === "failed") throw new Error("Upload failed: " + (p.message || "unknown"));
        await sleep(1000);
    }

    // ------------------------------------------------------------------
    // 3) APPLY to user session (what happens when you open/preview theme)
    //    This makes your current browser session show the new js immediately.
    // ------------------------------------------------------------------
    const applyUrl = `/accounts/${ACCOUNT_ID}/brand_configs/save_to_account`;

    const fdApply = new FormData();
    fdApply.append("brand_config[name]", THEME_NAME);
    for (const [k, v] of Object.entries(currentVars)) {
        fdApply.append(`brand_config[variables][${k}]`, String(v ?? ""));
    }
    fdApply.append("css_overrides", currentOverrides.css_overrides);
    fdApply.append("mobile_js_overrides", currentOverrides.mobile_js_overrides);
    fdApply.append("mobile_css_overrides", currentOverrides.mobile_css_overrides);
    fdApply.append("js_overrides", jsUrl); // string URL like UI

    const apResp = await fetch(applyUrl, {
        method: "POST",
        headers: {
            accept: "application/json+canvas-string-ids, application/json",
            "x-csrf-token": csrf,
            "x-requested-with": "XMLHttpRequest",
        },
        body: fdApply,
        credentials: "same-origin",
    });

    const apJson = await apResp.json().catch(() => null);
    console.log("Apply status:", apResp.status);
    console.log("Apply response:", apJson);

    const regenProgressUrl = apJson?.subAccountProgresses?.[0]?.url;
    if (regenProgressUrl) {
        for (let i = 0; i < 180; i++) {
            const p = await fetch(regenProgressUrl, { credentials: "same-origin" }).then((r) => r.json());
            console.log("[Regen progress]", p.workflow_state, p.completion, p.message || "");
            if (p.workflow_state === "completed") break;
            if (p.workflow_state === "failed") throw new Error("Regen failed: " + (p.message || "unknown"));
            await sleep(1000);
        }
    } else {
        console.warn("No regen progress returned; continuing.");
    }

    // ------------------------------------------------------------------
    // 4) SAVE the theme (this is the real “stickiness”)
    //    Updates shared_brand_config to point at the new md5.
    // ------------------------------------------------------------------
    const sharedUrl = `/api/v1/accounts/${ACCOUNT_ID}/shared_brand_configs/${SHARED_BRAND_CONFIG_ID}`;

    const saveResp = await fetch(sharedUrl, {
        method: "PUT",
        headers: {
            "content-type": "application/json",
            accept: "application/json+canvas-string-ids, application/json",
            "x-csrf-token": csrf,
            "x-requested-with": "XMLHttpRequest",
        },
        body: JSON.stringify({ shared_brand_config: { brand_config_md5: newMd5 } }),
        credentials: "same-origin",
    });

    console.log("Save status:", saveResp.status);
    console.log("Save response:", await saveResp.text());

    console.log("✅ Done.");
    console.log("Theme:", theme.name, "ID:", SHARED_BRAND_CONFIG_ID);
    console.log("Expected js_overrides URL:", jsUrl);
    console.log("Now refresh a normal Canvas page (not the theme editor) and confirm it loads the new loader.");
})();