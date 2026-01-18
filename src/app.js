import { mountAdminPanel } from "./admin/simpleAdminPanel.js";

(function () {
    console.log("[CG] App running with config:", window.CG_CONFIG);
    console.log("[CG] typeof mountAdminPanel:", typeof mountAdminPanel);

    if (typeof mountAdminPanel === "function") {
        mountAdminPanel();
    } else {
        console.warn("[CG] mountAdminPanel is not a function (likely undefined export/import).");
    }
})();