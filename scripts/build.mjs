import { build } from "esbuild";

await build({
    entryPoints: ["src/app.js"],
    bundle: true,
    minify: true,
    sourcemap: false,
    outfile: "dist/app.js",
    target: ["chrome110"],
});

console.log("Built dist/app.js");