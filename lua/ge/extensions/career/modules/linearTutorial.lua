-- This Source Code Form is subject to the terms of the bCDDL, v. 1.1.
-- If a copy of the bCDDL was not distributed with this
-- file, You can obtain one at http://beamng.com/bCDDL-1.1.txt

-- Compatibility shim for career_modules_linearTutorial.
--
-- 0.38 shipped a single career/modules/linearTutorial.lua. 0.39 removed it and
-- split its responsibilities in two:
--
--   career_modules_tutorial        step machine, "is the tutorial running"
--   career_modules_tutorialPopups  the persistent tutorial/intro-popup flags
--
-- The overhaul still calls the old module from nine places across seven
-- override files. Because the global simply no longer exists, those calls raise
-- "attempt to index global 'career_modules_linearTutorial' (a nil value)".
-- One of them is career/saveSystem.lua's saveCurrentActual, which runs on every
-- save attempt, so on 0.39 the career could not save at all.
--
-- Forwarding here fixes all nine call sites at once and keeps the mapping in a
-- single documented place. When the overhaul moves to the 0.39 API properly
-- this file is what gets deleted.

local M = {}

-- Deliberately no dependencies: every forward below resolves its target at call
-- time, so this must not constrain the order career.lua loads modules in.

-- Present so this module is discovered and loaded by career.lua's scan of
-- /lua/ge/extensions/career/modules/, which is also what defines the global.
local function onExtensionLoaded()
  return true
end

-- 0.38: is the linear onboarding tutorial currently running.
-- 0.39: the tutorial became a starting mode ("apmOnboarding") driven by
-- gameplay_tutorial_runtime, which career_modules_tutorial.isActive() reports.
local function isLinearTutorialActive()
  if career_modules_tutorial and career_modules_tutorial.isActive then
    return career_modules_tutorial.isActive() and true or false
  end
  return false
end

-- 0.38 numbered the tutorial steps and used -1 to mean "not in the tutorial".
-- 0.39 identifies steps by string id instead, so there is no number to return.
-- Every mod call site compares against -1, i.e. asks "is the tutorial over",
-- so answer that question and nothing more.
local function getLinearStep()
  return isLinearTutorialActive() and 0 or -1
end

local function getTutorialFlag(key)
  if career_modules_tutorialPopups and career_modules_tutorialPopups.getTutorialFlag then
    return career_modules_tutorialPopups.getTutorialFlag(key)
  end
  return nil
end

local function setTutorialFlag(key, value)
  if career_modules_tutorialPopups and career_modules_tutorialPopups.setTutorialFlag then
    return career_modules_tutorialPopups.setTutorialFlag(key, value)
  end
end

local function introPopup(id, force)
  if career_modules_tutorialPopups and career_modules_tutorialPopups.introPopup then
    return career_modules_tutorialPopups.introPopup(id, force)
  end
end

local function introPopupSequence(ids, force)
  if career_modules_tutorialPopups and career_modules_tutorialPopups.introPopupSequence then
    return career_modules_tutorialPopups.introPopupSequence(ids, force)
  end
end

M.onExtensionLoaded = onExtensionLoaded
M.isLinearTutorialActive = isLinearTutorialActive
M.getLinearStep = getLinearStep
M.getTutorialFlag = getTutorialFlag
M.setTutorialFlag = setTutorialFlag
M.introPopup = introPopup
M.introPopupSequence = introPopupSequence

return M
