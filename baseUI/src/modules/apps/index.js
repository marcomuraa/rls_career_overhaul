// "@/modules/apps" - dynamic UI apps barrel
// static named imports like `import { tasklist } from "@/modules/apps"` are
// rewritten at build time by the `bng-ui-apps-imports` vite plugin into calls
// to "@/modules/apps/runtime", so individual UI apps are never statically
// bundled
export { getUiApps, getUiAppComponent } from "./runtime"

