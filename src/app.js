import { mountAdminPanel } from "./admin/simpleAdminPanel.js";

// Simple proof-of-life app
(function () {
    const cfg = window.CG_CONFIG || {};
    console.log("[CG] App running with config:", cfg);

    mountAdminPanel();
})();