local M = {}

local speedUnit = 2.2369362921

local isPhoneOpen = false
local updateTimer = 0
local updateInterval = 2.5

-- 0.39 navigates through ui_router, which resolves names against the *Lua*
-- route tree in ui/router/routeManager.lua -- not the Vue router. Static Vue
-- routes are invisible to it (router/index.js only syncs runtime ones), so the
-- phone's screens have to be declared here or navigate() answers
-- "Route not found" and silently does nothing.
local ROUTE_SOURCE_ID = "rlsCareerOverhaul.phone"
local phoneRoutes = {
    {name = "phone-main"},
    {name = "phone-taxi"},
}

local function registerPhoneRoutes()
    local routeManager = extensions.ui_router_routeManager
    if not routeManager or not routeManager.registerModRoutes then return end
    routeManager.registerModRoutes(ROUTE_SOURCE_ID, phoneRoutes)
end

local function togglePhone(reason)
    --ui_phone_time.clearTime()
    if isPhoneOpen then
        isPhoneOpen = false
        guihooks.trigger('closePhone')
    else
        local playerSpeed = math.abs(be:getObjectVelocityXYZ(be:getPlayerVehicleID(0))) * speedUnit
        if (not gameplay_cab or not gameplay_cab.inCab()) and playerSpeed > 5 then
            if reason then
                ui_message(reason, 5, "info", "info")
            else
                ui_message("You must be stationary to open the phone.", 3, "info", "info")
            end
            return
        end
        isPhoneOpen = true
        -- guihooks.trigger('ChangeState', ...) no longer moves the UI on 0.39:
        -- nothing in the Vue app listens for it and navigates. Same reason
        -- career.closeAllMenus() was moved to ui_router.
        local onAJob = gameplay_taxiJobs and gameplay_taxiJobs.isTaxiJobActive()
        extensions.ui_router.navigate(onAJob and "phone-taxi" or "phone-main")
    end
end

local function onExtensionLoaded()
    isPhoneOpen = false
    registerPhoneRoutes()
end

local function onExtensionUnloaded()
    local routeManager = extensions.ui_router_routeManager
    if routeManager and routeManager.unregisterModRoutes then
        routeManager.unregisterModRoutes(ROUTE_SOURCE_ID)
    end
end

local function onUpdate(dt)
    updateTimer = updateTimer + dt
    if updateTimer > updateInterval then
        updateTimer = 0
        if isPhoneOpen then
            local playerSpeed = math.abs(be:getObjectVelocityXYZ(be:getPlayerVehicleID(0))) * speedUnit
            if (not gameplay_cab or not gameplay_cab.inCab()) and playerSpeed > 5 then
                isPhoneOpen = false
                ui_message("Phone closed due to player movement.", 3, "info", "info")
                guihooks.trigger('closePhone')
            end
        end
    end
end

M.onUIPlayStateChanged = function(changed)
    if changed then
        isPhoneOpen = false
    end
end

M.onUpdate = onUpdate
M.onExtensionLoaded = onExtensionLoaded
M.onExtensionUnloaded = onExtensionUnloaded
M.togglePhone = togglePhone
M.isPhoneOpen = function()
    return isPhoneOpen
end

return M