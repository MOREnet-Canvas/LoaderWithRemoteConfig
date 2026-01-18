// src/admin/adminLoaderBuilder.js
//
// Minimal Admin UI that lets an admin edit config + optional "other code",
// then generates a NEW loader .js file for them to download and upload in Canvas Theme Editor.
//
// Usage (from your runtime on /accounts/:id/theme_editor):
//   import { mountAdminLoaderBuilder } from "./adminLoaderBuilder";
//   mountAdminLoaderBuilder();
//
// Notes:
// - This does NOT call Canvas APIs.
// - It generates a small-ish loader that:
//   1) defines window.CG_CONFIG for this domain
//   2) (optionally) preserves/admin-injected code in a marked block
//   3) loads your remote runtime.js from GitHub/CDN
//

export function mountAdminLoaderBuilder(options = {}) {
    const defaults = {
        title: "CustomizedGradebook, Admin Loader Builder",
        runtimeUrlDefault:
            "https://morenet-canvas.github.io/CustomizedGradebook/runtime.js",
        filenameDefault: "customizedgradebook-loader.js",
        // If you want per-domain defaults, you can pass in options.defaultConfigByHost
        defaultConfigByHost: {},
        // If true, show the "Other code" textarea
        allowOtherCode: true,
    };

    const opts = { ...defaults, ...options };
    const host = window.location.hostname;

    const initialConfig =
        opts.defaultConfigByHost?.[host] ??
        {
            // Keep this minimal. Your runtime can expand/validate.
            ENABLE_STUDENT_GRADE_CUSTOMIZATION: true,
            ENABLE_GRADE_OVERRIDE: true,
            ENABLE_OUTCOME_UPDATES: false,
            UPDATE_AVG_BUTTON_LABEL: "Update Current Score",
            AVG_OUTCOME_NAME: "Current Score",
            AVG_ASSIGNMENT_NAME: "Current Score Assignment",
            AVG_RUBRIC_NAME: "Current Score Rubric",
        };

    // Avoid double-mount
    if (document.getElementById("cg-admin-loader-builder")) return;

    const container = document.createElement("div");
    container.id = "cg-admin-loader-builder";
    container.style.cssText = [
        "position:fixed",
        "top:16px",
        "right:16px",
        "z-index:2147483647",
        "width:420px",
        "max-height:80vh",
        "overflow:auto",
        "background:#fff",
        "border:1px solid rgba(0,0,0,0.15)",
        "border-radius:12px",
        "box-shadow:0 10px 30px rgba(0,0,0,0.2)",
        "padding:14px",
        "font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif",
    ].join(";");

    container.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;justify-content:space-between;margin-bottom:10px;">
      <div style="font-weight:700;font-size:14px;line-height:1.2;">${escapeHtml(
        opts.title
    )}</div>
      <button id="cg-admin-close" style="${btnStyle(
        "secondary"
    )}">Close</button>
    </div>

    <div style="font-size:12px;color:#444;margin-bottom:10px;">
      This builds a <b>new Theme JS loader file</b> you can download and upload in Canvas.
      It does not change the theme automatically.
    </div>

    <label style="${labelStyle()}">Runtime URL (remote module)</label>
    <input id="cg-runtime-url" type="text" style="${inputStyle()}" value="${escapeAttr(
        opts.runtimeUrlDefault
    )}" />

    <label style="${labelStyle()}">Output filename</label>
    <input id="cg-filename" type="text" style="${inputStyle()}" value="${escapeAttr(
        opts.filenameDefault
    )}" />

    <label style="${labelStyle()}">Config JSON (saved into loader)</label>
    <textarea id="cg-config-json" style="${textareaStyle(
        170
    )}">${escapeHtml(JSON.stringify(initialConfig, null, 2))}</textarea>

    ${
        opts.allowOtherCode
            ? `
      <label style="${labelStyle()}">Other Theme JS (optional, preserved)</label>
      <textarea id="cg-other-code" placeholder="Paste other code you need to keep here (optional)..." style="${textareaStyle(
                130
            )}"></textarea>
      <div style="font-size:11px;color:#666;margin-top:6px;">
        This will be wrapped inside marker comments so it can be distinguished from CG-managed code.
      </div>
    `
            : ""
    }

    <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;">
      <button id="cg-build-download" style="${btnStyle(
        "primary"
    )}">Build & Download loader</button>
      <button id="cg-preview" style="${btnStyle(
        "secondary"
    )}">Preview generated loader</button>
      <button id="cg-copy" style="${btnStyle(
        "secondary"
    )}">Copy loader to clipboard</button>
    </div>

    <div id="cg-status" style="margin-top:10px;font-size:12px;"></div>

    <details style="margin-top:10px;">
      <summary style="cursor:pointer;font-size:12px;">Generated loader preview</summary>
      <pre id="cg-preview-out" style="white-space:pre-wrap;background:#f7f7f7;border:1px solid #e5e5e5;border-radius:10px;padding:10px;margin-top:8px;font-size:11px;max-height:260px;overflow:auto;"></pre>
    </details>
  `;

    document.body.appendChild(container);

    // Wire up events
    container.querySelector("#cg-admin-close").addEventListener("click", () => {
        container.remove();
    });

    container.querySelector("#cg-build-download").addEventListener("click", () => {
        try {
            const loaderText = buildLoaderFromUI(container, opts);
            const filename = getValue(container, "#cg-filename") || "loader.js";
            downloadText(filename, loaderText);
            setStatus(container, "✅ Download started. Upload this file in Canvas Theme Editor.", "ok");
        } catch (e) {
            setStatus(container, `❌ ${e.message}`, "err");
        }
    });

    container.querySelector("#cg-preview").addEventListener("click", () => {
        try {
            const loaderText = buildLoaderFromUI(container, opts);
            container.querySelector("#cg-preview-out").textContent = loaderText;
            setStatus(container, "Preview updated.", "ok");
        } catch (e) {
            setStatus(container, `❌ ${e.message}`, "err");
        }
    });

    container.querySelector("#cg-copy").addEventListener("click", async () => {
        try {
            const loaderText = buildLoaderFromUI(container, opts);
            await navigator.clipboard.writeText(loaderText);
            setStatus(container, "✅ Copied loader to clipboard.", "ok");
        } catch (e) {
            setStatus(container, `❌ ${e.message}`, "err");
        }
    });

    // Initial preview
    try {
        const loaderText = buildLoaderFromUI(container, opts);
        container.querySelector("#cg-preview-out").textContent = loaderText;
    } catch {
        // ignore
    }
}

function buildLoaderFromUI(container, opts) {
    const runtimeUrl = getValue(container, "#cg-runtime-url").trim();
    if (!runtimeUrl) throw new Error("Runtime URL is required.");

    const configRaw = getValue(container, "#cg-config-json").trim();
    if (!configRaw) throw new Error("Config JSON is required.");

    let configObj;
    try {
        configObj = JSON.parse(configRaw);
    } catch (e) {
        throw new Error("Config JSON is not valid JSON.");
    }

    const otherCode = opts.allowOtherCode
        ? (getValue(container, "#cg-other-code") || "").trim()
        : "";

    return makeLoaderText({
        runtimeUrl,
        configObj,
        otherCode,
    });
}

function makeLoaderText({ runtimeUrl, configObj, otherCode }) {
    const configJson = JSON.stringify(configObj, null, 2);

    // Markers so you can distinguish CG-managed vs user-managed code later.
    const USER_BEGIN = "/* === CG:BEGIN USER CODE === */";
    const USER_END = "/* === CG:END USER CODE === */";

    return `/**
 * CustomizedGradebook - Theme JS Loader
 * Generated: ${new Date().toISOString()}
 *
 * This file is intended to be uploaded as Canvas Theme JS (js_overrides).
 *
 * Sections:
 *  - CG-managed bootstrap (loads remote runtime)
 *  - Optional user code in marker block
 */

(function () {
  if (window.__CG_BOOTSTRAPPED__) return;
  window.__CG_BOOTSTRAPPED__ = true;

  // --- Context (safe-ish metadata) ---
  window.CG_CONTEXT = {
    domain: location.hostname,
    accountId: (window.ENV && ENV.ACCOUNT_ID) ? ENV.ACCOUNT_ID : null,
    themeMd5: (window.ENV && ENV.active_brand_config && ENV.active_brand_config.md5) ? ENV.active_brand_config.md5 : null
  };

  // --- Config (admin edited) ---
  window.CG_CONFIG = ${configJson};

  ${USER_BEGIN}
${indentBlock(otherCode || "// (none)", 2)}
  ${USER_END}

  // --- Load remote runtime ---
  var s = document.createElement("script");
  s.src = "${escapeForJsString(runtimeUrl)}" + (runtimeUrl.includes("?") ? "&" : "?") + "v=" + Date.now();
  s.defer = true;
  s.onload = function () { try { console.log("[CG] runtime loaded"); } catch(e) {} };
  s.onerror = function () { try { console.error("[CG] runtime failed to load:", s.src); } catch(e) {} };
  document.head.appendChild(s);
})();
`;
}

/* ----------------------------- helpers ----------------------------- */

function setStatus(container, msg, kind) {
    const el = container.querySelector("#cg-status");
    const color = kind === "err" ? "#b00020" : "#166534";
    el.style.color = color;
    el.innerHTML = msg;
}

function getValue(container, sel) {
    const el = container.querySelector(sel);
    return el ? el.value : "";
}

function downloadText(filename, text) {
    const blob = new Blob([text], { type: "text/javascript;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function btnStyle(kind) {
    const base =
        "border:1px solid rgba(0,0,0,0.15);border-radius:10px;padding:8px 10px;font-size:12px;cursor:pointer;";
    if (kind === "primary") {
        return base + "background:#111;color:#fff;";
    }
    return base + "background:#f5f5f5;color:#111;";
}

function labelStyle() {
    return "display:block;margin-top:10px;margin-bottom:6px;font-size:12px;color:#222;font-weight:600;";
}

function inputStyle() {
    return "width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #ddd;border-radius:10px;font-size:12px;";
}

function textareaStyle(heightPx) {
    return `width:100%;box-sizing:border-box;min-height:${heightPx}px;padding:8px 10px;border:1px solid #ddd;border-radius:10px;font-size:12px;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;`;
}

function indentBlock(text, spaces) {
    const pad = " ".repeat(spaces);
    return String(text)
        .split("\n")
        .map((l) => pad + l)
        .join("\n");
}

function escapeForJsString(s) {
    // basic escape for embedding in "...".
    return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function escapeHtml(s) {
    return String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function escapeAttr(s) {
    return String(s).replaceAll('"', "&quot;");
}