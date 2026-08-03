export function getInjector() {
  if (typeof window.angular === "undefined" || !window.angular.element) {
    throw new Error("Angular is not loaded")
  }
  const rootElement = document.getElementById("angular-root") || document
  const injector = window.angular.element(rootElement).injector()
  if (!injector) {
    throw new Error("Angular injector not available -- is Angular bootstrapped?")
  }
  return injector
}

export function isDirectiveRegistered(directiveName) {
  try {
    return getInjector().has(directiveName + "Directive")
  } catch {
    return false
  }
}

export function loadDirective(appData) {
  const injector = getInjector()
  if (injector.has(appData.directive + "Directive")) {
    return Promise.resolve()
  }
  if (!appData.jsSource) {
    return Promise.reject(new Error(`No jsSource for directive "${appData.directive}"`))
  }
  const $ocLazyLoad = injector.get("$ocLazyLoad")
  return new Promise((resolve, reject) => {
    $ocLazyLoad.load(appData.jsSource).then(resolve, reject)
  })
}

export function compileInto(html, hostElement) {
  const injector = getInjector()
  const $compile = injector.get("$compile")
  const $rootScope = injector.get("$rootScope")

  const scope = $rootScope.$new(true)
  const compiled = $compile(html)(scope)
  hostElement.appendChild(compiled[0])
  scope.$apply()

  return { element: compiled[0], scope }
}

export function destroyScope(scope, element) {
  if (scope) scope.$destroy()
  if (element && element.parentNode) element.parentNode.removeChild(element)
}
