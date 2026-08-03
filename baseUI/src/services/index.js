export { $translate } from "./translation.js"
export { default as SysInfo } from "./sysInfo.js"
export { useRouteDataStore } from "./routeData.js"
export { useGameContextStore } from "./gameContextStore.js"
import * as $content from "./content/index.js"
export { $content }
export { startLoading } from "./screenCover.js"

// import just for side effects (ensure window.bngNavigator is available)
import "./navigator-class.js"
