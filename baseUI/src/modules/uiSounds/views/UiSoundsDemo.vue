<template>
  <LayoutMenu
    class="ui-sounds-demo"
    nav-scope="ui-sounds-demo"
    :nav-active="false"
    :breadcrumbs="breadcrumbItems"
    heading="UI Sounds Demo"
    @breadcrumb-click="onBreadcrumbClick"
    @breadcrumb-back="onBreadcrumbBack"
  >
    <div class="ui-sounds-demo__content">
      <section class="ui-sounds-demo__intro">
        <Background class="ui-sounds-demo__intro-background" />
        <p class="ui-sounds-demo__eyebrow">Menu UI audio</p>
        <p>
          Core interaction matrix for checking current UI sound classes against live BeamNG controls.
        </p>
        <div class="ui-sounds-demo__legend" aria-label="Sound wiring legend">
          <span><strong>Component/default candidate</strong> Existing component sound, or a concise candidate for a future component default.</span>
          <span><strong>Template override</strong> Call-site sound class with <code>v-bng-sound-class</code>.</span>
          <span><strong>Explicit lifecycle call</strong> Scripted playback through <code>lua.ui_audio.playEventSound</code>.</span>
        </div>
        <p class="ui-sounds-demo__future-defaults">
          Canonical main classes covered here: primary, selector, secondary, secondary alt, switch, and slider.
        </p>
      </section>

      <section class="ui-sounds-demo__sections" aria-label="Core UI sound test matrix">
        <article class="ui-sounds-demo__card">
          <Background class="ui-sounds-demo__card-background" />
          <h2>Buttons</h2>
          <p>Default and template-level button sound mappings.</p>

          <div class="ui-sounds-demo__rows">
            <div class="ui-sounds-demo__row">
              <div class="ui-sounds-demo__control">
                <BngButton no-sound v-bng-sound-class="'bng_main_primary'" @click="recordAction('Main primary button')">Main primary</BngButton>
              </div>
              <div class="ui-sounds-demo__meta">
                <strong>Main primary button</strong>
                <span>Class <code>bng_main_primary</code></span>
                <span><code>click</code> -> <code>event:&gt;UI&gt;Main&gt;click_01</code>; <code>mouseenter/focus</code> -> <code>event:&gt;UI&gt;Main&gt;hover_01</code></span>
              </div>
            </div>

            <div class="ui-sounds-demo__row">
              <div class="ui-sounds-demo__control">
                <BngButton no-sound :icon="icons.bus" :accent="ACCENTS.outlined" aria-label="Main secondary sound test" v-bng-sound-class="'bng_main_secondary'" @click="recordAction('Main secondary button')" />
              </div>
              <div class="ui-sounds-demo__meta">
                <strong>Main secondary icon button</strong>
                <span>Class <code>bng_main_secondary</code></span>
                <span><code>click</code> -> <code>event:&gt;UI&gt;Main&gt;click_03</code>; <code>mouseenter/focus</code> -> <code>event:&gt;UI&gt;Main&gt;hover_03</code></span>
              </div>
            </div>

            <div class="ui-sounds-demo__row">
              <div class="ui-sounds-demo__control">
                <BngButton no-sound :icon-left="icons.arrowLargeLeft" :accent="ACCENTS.secondary" v-bng-sound-class="'bng_back_hover_generic'" @click="recordAction('Back button')">
                  Back
                </BngButton>
              </div>
              <div class="ui-sounds-demo__meta">
                <strong>Back button</strong>
                <span>Class <code>bng_back_hover_generic</code></span>
                <span>Events <code>click</code>, <code>mouseenter</code>, <code>focus</code></span>
              </div>
            </div>

            <div class="ui-sounds-demo__row">
              <div class="ui-sounds-demo__control">
                <BngButton no-sound :icon-left="icons.xmark" :accent="ACCENTS.attention" v-bng-sound-class="'bng_cancel_hover_generic'" @click="recordAction('Cancel button')">
                  Cancel
                </BngButton>
              </div>
              <div class="ui-sounds-demo__meta">
                <strong>Cancel button</strong>
                <span>Class <code>bng_cancel_hover_generic</code></span>
                <span>Events <code>click</code>, <code>mouseenter</code>, <code>focus</code></span>
              </div>
            </div>

            <div class="ui-sounds-demo__row">
              <div class="ui-sounds-demo__control">
                <BngButton no-sound :accent="ACCENTS.text" @click="recordAction('No-sound button')">No sound</BngButton>
              </div>
              <div class="ui-sounds-demo__meta">
                <strong>No-sound button</strong>
                <span>Class <code>none</code></span>
                <span>Events <code>none</code></span>
              </div>
            </div>

            <div class="ui-sounds-demo__row">
              <div class="ui-sounds-demo__control">
                <BngButton no-sound :accent="ACCENTS.secondary" v-bng-sound-class="'bng_main_secondary_alt'" @click="recordAction('Main secondary alt')">
                  Main secondary alt
                </BngButton>
              </div>
              <div class="ui-sounds-demo__meta">
                <strong>Main secondary alt</strong>
                <span>Class <code>bng_main_secondary_alt</code></span>
                <span><code>click</code> -> <code>event:&gt;UI&gt;Main&gt;click_03</code>; <code>mouseenter/focus</code> -> <code>event:&gt;UI&gt;Main&gt;hover_04</code></span>
              </div>
            </div>

            <div class="ui-sounds-demo__row">
              <div class="ui-sounds-demo__control">
                <BngButton no-sound :accent="ACCENTS.outlined" v-bng-sound-class="'bng_main_selector'" @click="recordAction('Main selector button')">
                  Main selector
                </BngButton>
              </div>
              <div class="ui-sounds-demo__meta">
                <strong>Main selector button</strong>
                <span>Class <code>bng_main_selector</code></span>
                <span><code>click</code> -> <code>event:&gt;UI&gt;Main&gt;click_02</code>; <code>mouseenter/focus</code> -> <code>event:&gt;UI&gt;Main&gt;hover_02</code></span>
              </div>
            </div>
          </div>
        </article>

        <article class="ui-sounds-demo__card">
          <Background class="ui-sounds-demo__card-background" />
          <h2>Hold Lifecycle</h2>
          <p>Explicit lifecycle playback for a click-and-hold source.</p>
          <p class="ui-sounds-demo__note">
            Known external FMOD content issue: early cancel sends <code>cancelled=1</code>, <code>completed=0</code>, but the event may still later play completion audio.
          </p>

          <div class="ui-sounds-demo__rows">
            <div v-for="holdCase in holdCases" :key="holdCase.id" class="ui-sounds-demo__row">
              <div class="ui-sounds-demo__control">
                <BngButton
                  show-hold
                  no-sound
                  :accent="ACCENTS.attention"
                  v-bng-on-ui-nav:ok.asMouse.focusRequired
                  v-bng-click="{ holdCallback: () => completeHoldSound(holdCase), holdDelay: holdCase.delay, repeatInterval: 0 }"
                  @mousedown="event => startHoldSound(event, holdCase)"
                  @mouseup="event => endHoldSound(event, holdCase)"
                  @mouseleave="event => cancelHoldSound(event, holdCase)"
                  @blur="event => cancelHoldSound(event, holdCase)"
                >
                  Hold {{ holdCase.label }}
                </BngButton>
                <span class="ui-sounds-demo__status">{{ holdStatuses[holdCase.id] }}</span>
              </div>
              <div class="ui-sounds-demo__meta">
                <strong>Explicit hold lifecycle {{ holdCase.label }}</strong>
                <span>Class <code>bng_hold_activate</code></span>
                <span>Delay <code>{{ holdCase.delay }}ms</code>; explicit events <code>start</code>, <code>complete</code>, <code>cancel</code></span>
              </div>
            </div>
          </div>
        </article>

        <article class="ui-sounds-demo__card">
          <Background class="ui-sounds-demo__card-background" />
          <h2>Toggles</h2>
          <p>Checkbox-style click sound mappings on toggle controls.</p>

          <div class="ui-sounds-demo__rows">
            <div class="ui-sounds-demo__row">
              <div class="ui-sounds-demo__control">
                <BngSwitch v-model="switchValue" label="Switch audio" />
              </div>
              <div class="ui-sounds-demo__meta">
                <strong>BngSwitch</strong>
                <span>Class <code>bng_switch</code></span>
                <span><code>click</code> -> <code>event:&gt;UI&gt;Main&gt;switch</code></span>
              </div>
            </div>

            <div class="ui-sounds-demo__row">
              <div class="ui-sounds-demo__control">
                <BngPillCheckbox v-model="pillValue">Pill checkbox</BngPillCheckbox>
              </div>
              <div class="ui-sounds-demo__meta">
                <strong>BngPillCheckbox</strong>
                <span>Class <code>bng_switch</code></span>
                <span><code>click</code> -> <code>event:&gt;UI&gt;Main&gt;switch</code></span>
              </div>
            </div>
          </div>
        </article>

        <article class="ui-sounds-demo__card">
          <Background class="ui-sounds-demo__card-background" />
          <h2>Select / Dropdown</h2>
          <p>Selector controls using the current generic click and hover sounds.</p>

          <div class="ui-sounds-demo__rows">
            <div class="ui-sounds-demo__row">
              <div class="ui-sounds-demo__control ui-sounds-demo__control--wide">
                <BngSelect v-model="selectValue" :options="selectOptions" loop @change="value => recordAction(`BngSelect: ${value}`)" />
              </div>
              <div class="ui-sounds-demo__meta">
                <strong>BngSelect</strong>
                <span>Class <code>bng_click_hover_generic</code></span>
                <span>Events <code>click</code>, <code>mouseenter</code>, <code>focus</code></span>
              </div>
            </div>

            <div class="ui-sounds-demo__row">
              <div class="ui-sounds-demo__control ui-sounds-demo__control--wide">
                <BngSmartSelect v-model="smartSelectValue" :items="smartSelectItems" type="select" @change="value => recordAction(`BngSmartSelect: ${value}`)" />
              </div>
              <div class="ui-sounds-demo__meta">
                <strong>BngSmartSelect</strong>
                <span>Class <code>bng_click_hover_generic</code></span>
                <span>Events <code>click</code>, <code>mouseenter</code>, <code>focus</code></span>
              </div>
            </div>

            <div class="ui-sounds-demo__row">
              <div class="ui-sounds-demo__control ui-sounds-demo__control--wide" v-bng-sound-class="'bng_click_hover_generic'">
                <BngDropdown v-model="dropdownValue" :items="dropdownItems" @valueChanged="onDropdownValueChanged" />
              </div>
              <div class="ui-sounds-demo__meta">
                <strong>BngDropdown</strong>
                <span>Class <code>bng_click_hover_generic</code></span>
                <span>Events <code>click</code>, <code>mouseenter</code>; explicit <code>valueChanged</code> click</span>
              </div>
            </div>
          </div>
        </article>

        <article class="ui-sounds-demo__card">
          <Background class="ui-sounds-demo__card-background" />
          <h2>Inputs</h2>
          <p>Text confirmation and number spinner click/hold surfaces.</p>

          <div class="ui-sounds-demo__rows">
            <div class="ui-sounds-demo__row">
              <div class="ui-sounds-demo__control ui-sounds-demo__control--wide">
                <BngInput
                  v-model="inputTextValue"
                  floating-label="Confirm text"
                  @focus="onTextInputFocus"
                  @enter="onTextInputEnter"
                />
                <span class="ui-sounds-demo__status">Press Enter after editing</span>
              </div>
              <div class="ui-sounds-demo__meta">
                <strong>BngInput text</strong>
                <span>Class <code>bng_click_hover_generic</code></span>
                <span>Events explicit <code>focus</code>, <code>click</code> on <code>enter</code></span>
              </div>
            </div>

            <div class="ui-sounds-demo__row">
              <div class="ui-sounds-demo__control ui-sounds-demo__control--wide">
                <BngInput v-model="inputNumberValue" type="number" :min="0" :max="5" :step="1" floating-label="Spinner" @valueChanged="value => recordAction(`BngInput number: ${value}`)" />
                <span class="ui-sounds-demo__status">Value {{ inputNumberValue }}</span>
              </div>
              <div class="ui-sounds-demo__meta">
                <strong>BngInput number</strong>
                <span>Class <code>bng_click_hover_generic</code></span>
                <span>Spinner buttons emit <code>click</code>, <code>mouseenter</code>, <code>focus</code>; hold repeats value changes</span>
              </div>
            </div>
          </div>
        </article>

        <article class="ui-sounds-demo__card">
          <Background class="ui-sounds-demo__card-background" />
          <h2>Rows</h2>
          <p>Row-owned activation and a row with a registered nested control.</p>

          <div class="ui-sounds-demo__rows">
            <div class="ui-sounds-demo__row">
              <div class="ui-sounds-demo__control ui-sounds-demo__control--wide">
                <BngRow class="ui-sounds-demo__bng-row" label="Activate this row" @activate="onPlainRowActivate">
                  <span>{{ rowActivationCount }} activations</span>
                </BngRow>
              </div>
              <div class="ui-sounds-demo__meta">
                <strong>BngRow root surface</strong>
                <span>Class <code>bng_main_secondary</code></span>
                <span>Row surface emits <code>click</code>, <code>mouseenter</code>, <code>focus</code></span>
              </div>
            </div>

            <div class="ui-sounds-demo__row">
              <div class="ui-sounds-demo__control ui-sounds-demo__control--wide">
                <BngRow class="ui-sounds-demo__bng-row" label="Row targets nested button">
                  <BngButton no-sound :accent="ACCENTS.secondary" @click="onNestedRowButtonActivate">Nested action</BngButton>
                </BngRow>
              </div>
              <div class="ui-sounds-demo__meta">
                <strong>BngRow + BngButton</strong>
                <span>Class <code>bng_main_secondary</code>; explicit <code>bng_click_generic</code></span>
                <span>Row hover/focus sound comes from row; activation clicks the nested control</span>
              </div>
            </div>
          </div>
        </article>

        <article class="ui-sounds-demo__card">
          <Background class="ui-sounds-demo__card-background" />
          <h2>Sliders</h2>
          <p>Step changes play the canonical slider click sound through the component default.</p>

          <div class="ui-sounds-demo__rows">
            <div class="ui-sounds-demo__row">
              <div class="ui-sounds-demo__control ui-sounds-demo__control--wide">
                <BngSlider v-model="sliderCoarseValue" :min="0" :max="100" :step="10" :debounce="0" @valueChanged="value => recordAction(`Slider coarse: ${value}`)" />
                <span class="ui-sounds-demo__status">Value {{ sliderCoarseValue }}</span>
              </div>
              <div class="ui-sounds-demo__meta">
                <strong>BngSlider coarse steps</strong>
                <span>Class <code>bng_slider</code></span>
                <span><code>click</code> -> <code>event:&gt;UI&gt;Main&gt;slider</code> on every crossed step</span>
              </div>
            </div>

            <div class="ui-sounds-demo__row">
              <div class="ui-sounds-demo__control ui-sounds-demo__control--wide">
                <BngSlider v-model="sliderFineValue" :min="0" :max="1" :step="0.1" :debounce="0" @valueChanged="value => recordAction(`Slider fine: ${value}`)" />
                <span class="ui-sounds-demo__status">Value {{ sliderFineValue.toFixed(1) }}</span>
              </div>
              <div class="ui-sounds-demo__meta">
                <strong>BngSlider fine steps</strong>
                <span>Class <code>bng_slider</code></span>
                <span><code>click</code> -> <code>event:&gt;UI&gt;Main&gt;slider</code> on every crossed step</span>
              </div>
            </div>

            <div class="ui-sounds-demo__row">
              <div class="ui-sounds-demo__control ui-sounds-demo__control--wide">
                <BngSlider
                  v-model="sliderExtendedValue"
                  :min="0"
                  :max="100"
                  :step="25"
                  :orig-value="50"
                  :debounce="0"
                  :markers="sliderExtendedMarkers"
                  always-show-markers
                  with-reset
                  @valueChanged="value => recordAction(`Slider extended: ${value}`)"
                />
                <span class="ui-sounds-demo__status">Value {{ sliderExtendedValue }}</span>
              </div>
              <div class="ui-sounds-demo__meta">
                <strong>BngSlider reset + markers</strong>
                <span>Class <code>bng_slider</code>; reset button keeps its component default</span>
                <span>Marker/reset value changes play <code>event:&gt;UI&gt;Main&gt;slider</code> through the component default</span>
              </div>
            </div>
          </div>
        </article>

        <article class="ui-sounds-demo__card">
          <Background class="ui-sounds-demo__card-background" />
          <h2>Tiles / List</h2>
          <p>Selection surfaces that do not change component-level defaults.</p>

          <div class="ui-sounds-demo__rows">
            <div class="ui-sounds-demo__row">
              <div class="ui-sounds-demo__control">
                <BngTile
                  v-for="tile in tileCases"
                  :key="tile.id"
                  class="ui-sounds-demo__tile"
                  :class="{ active: selectedTileId === tile.id }"
                  :label="tile.label"
                  ratio="1:1"
                  v-bng-sound-class="'bng_click_hover_bigmap'"
                  @click="selectTile(tile)"
                >
                  <strong>{{ tile.short }}</strong>
                </BngTile>
              </div>
              <div class="ui-sounds-demo__meta">
                <strong>BngTile selection</strong>
                <span>Class <code>bng_click_hover_bigmap</code></span>
                <span>Tile root emits <code>click</code>, <code>mouseenter</code>, <code>focus</code></span>
              </div>
            </div>

            <div class="ui-sounds-demo__row">
              <div class="ui-sounds-demo__control ui-sounds-demo__control--wide">
                <BngList class="ui-sounds-demo__compact-list" :layout="LIST_LAYOUTS.LIST" :tile-height="2.75" :tile-margin="0.25" no-background>
                  <BngCard
                    v-for="card in listCards"
                    :key="card.id"
                    bng-nav-item
                    class="ui-sounds-demo__list-card"
                    :class="{ active: selectedListCardId === card.id }"
                    v-bng-sound-class="'bng_click_hover_generic'"
                    @click="selectListCard(card)"
                  >
                    <strong>{{ card.label }}</strong>
                    <span>{{ card.description }}</span>
                  </BngCard>
                </BngList>
              </div>
              <div class="ui-sounds-demo__meta">
                <strong>BngList card selection</strong>
                <span>Class <code>bng_click_hover_generic</code></span>
                <span>Small card item emits <code>click</code>, <code>mouseenter</code>, <code>focus</code></span>
              </div>
            </div>
          </div>
        </article>

        <article class="ui-sounds-demo__card">
          <Background class="ui-sounds-demo__card-background" />
          <h2>Utility Controls</h2>
          <p>Compact controls with distinct button-driven sound surfaces.</p>

          <div class="ui-sounds-demo__rows">
            <div class="ui-sounds-demo__row">
              <div class="ui-sounds-demo__control ui-sounds-demo__control--wide">
                <BngTabs v-model="tabsValue" class="ui-sounds-demo__tabs" :show-arrows="false" @change="onTabsChange">
                  <div tab-heading="Audio">Tab header click selected Audio.</div>
                  <div tab-heading="Nav">Tab header click selected Nav.</div>
                </BngTabs>
              </div>
              <div class="ui-sounds-demo__meta">
                <strong>BngTabs headers</strong>
                <span>Class <code>bng_click_hover_generic</code></span>
                <span>Tab header buttons emit <code>click</code>, <code>mouseenter</code>, <code>focus</code></span>
              </div>
            </div>

            <div class="ui-sounds-demo__row">
              <div class="ui-sounds-demo__control ui-sounds-demo__control--wide">
                <BngDrawer v-model="drawerExpanded" class="ui-sounds-demo__drawer" header="Compact drawer" @change="onDrawerChange">
                  <template #content>
                    <span>Collapsed content</span>
                  </template>
                  <template #expanded-content>
                    <span>Expanded drawer content</span>
                  </template>
                </BngDrawer>
              </div>
              <div class="ui-sounds-demo__meta">
                <strong>BngDrawer expand</strong>
                <span>Class <code>bng_click_hover_generic</code></span>
                <span>Expand/collapse button emits <code>click</code>, <code>mouseenter</code>, <code>focus</code></span>
              </div>
            </div>
          </div>
        </article>

        <article class="ui-sounds-demo__card">
          <Background class="ui-sounds-demo__card-background" />
          <h2>Popup / Menu</h2>
          <p>Popover open/close triggers and menu item button sounds.</p>

          <div class="ui-sounds-demo__rows">
            <div class="ui-sounds-demo__row">
              <div class="ui-sounds-demo__control">
                <BngButton v-bng-on-ui-nav:ok.asMouse.focusRequired v-bng-popover:right-start.click="'ui-sounds-popover-menu'" @click="recordAction('Popover menu trigger')">
                  Open menu
                </BngButton>
                <span class="ui-sounds-demo__status">{{ menuStatus }}</span>
              </div>
              <div class="ui-sounds-demo__meta">
                <strong>BngPopoverMenu trigger</strong>
                <span>Class <code>bng_click_hover_generic</code></span>
                <span>Events <code>click</code>, <code>mouseenter</code>, <code>focus</code></span>
              </div>
            </div>

            <div class="ui-sounds-demo__row">
              <div class="ui-sounds-demo__control">
                <BngButton :accent="ACCENTS.secondary" v-bng-popover:bottom-start.click="'ui-sounds-simple-popover'" @click="recordAction('Simple popover trigger')">
                  Open popover
                </BngButton>
                <span class="ui-sounds-demo__status">{{ popoverStatus }}</span>
              </div>
              <div class="ui-sounds-demo__meta">
                <strong>Simple popover trigger</strong>
                <span>Class <code>bng_click_hover_generic</code></span>
                <span>Events <code>click</code>, <code>mouseenter</code>, <code>focus</code></span>
              </div>
            </div>
          </div>
        </article>
      </section>

      <p class="ui-sounds-demo__last-action">Last action: {{ lastAction }}</p>
    </div>

    <BngPopoverMenu name="ui-sounds-popover-menu" @show="setMenuStatus(true)" @hide="setMenuStatus(false)">
      <template #default="{ hide }">
        <BngButton :accent="ACCENTS.menu" @click="recordAction('Menu item one')">Menu item one</BngButton>
        <BngButton :accent="ACCENTS.menu" :icon-left="icons.aperture" @click="recordAction('Menu item with icon')">Menu item with icon</BngButton>
        <BngButton no-sound :accent="ACCENTS.menu" v-bng-sound-class="'bng_cancel_generic'" @click="hide">Close menu</BngButton>
      </template>
    </BngPopoverMenu>

    <BngPopoverContent name="ui-sounds-simple-popover" @show="setPopoverStatus(true)" @hide="setPopoverStatus(false)">
      <template #default="{ hide }">
        <div class="ui-sounds-demo__popover-panel">
          <strong>Simple popover</strong>
          <span>Open/close behavior with button sounds.</span>
          <BngButton no-sound :accent="ACCENTS.secondary" v-bng-sound-class="'bng_cancel_generic'" @click="hide">Close popover</BngButton>
        </div>
      </template>
    </BngPopoverContent>
  </LayoutMenu>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from "vue"
import { LayoutMenu } from "@/common/layouts"
import { Background } from "@/common/components/utility"
import {
  BngButton,
  BngCard,
  BngDrawer,
  BngDropdown,
  BngInput,
  BngList,
  BngPillCheckbox,
  BngPopoverContent,
  BngPopoverMenu,
  BngRow,
  BngSelect,
  BngSlider,
  BngSmartSelect,
  BngSwitch,
  BngTabs,
  BngTile,
  LIST_LAYOUTS,
  ACCENTS,
  icons,
} from "@/common/components/base"
import { vBngClick, vBngOnUiNav, vBngPopover, vBngSoundClass } from "@/common/directives"
import { lua } from "@/bridge"
import { useRouteDataStore } from "@/services/routeData"

defineOptions({ name: "UiSoundsDemo" })

const routeDataStore = useRouteDataStore()
const breadcrumbItems = computed(() => Array.isArray(routeDataStore.breadcrumbs) ? routeDataStore.breadcrumbs : [])

const holdSoundClass = "bng_hold_activate"
const holdInstanceId = "ui-sounds-demo-hold"

const selectOptions = Object.freeze(["Comfort", "Sport", "Race"])
const smartSelectItems = Object.freeze([
  { label: "Comfort", value: "comfort" },
  { label: "Sport", value: "sport" },
  { label: "Race", value: "race" },
])
const dropdownItems = Object.freeze([
  { label: "Low intensity", value: "low" },
  { label: "Medium intensity", value: "medium" },
  { label: "High intensity", value: "high" },
])
const sliderExtendedMarkers = Object.freeze([
  { value: 0, icon: icons.beamNG, tooltip: "Minimum" },
  { value: 50, icon: icons.adjust, tooltip: "Original" },
  { value: 100, icon: icons.raceFlag, tooltip: "Maximum" },
])
const tileCases = Object.freeze([
  { id: "garage", label: "Garage", short: "G" },
  { id: "map", label: "Map", short: "M" },
])
const listCards = Object.freeze([
  { id: "compact", label: "Compact card", description: "Primary choice" },
  { id: "alternate", label: "Alternate card", description: "Secondary choice" },
])
const holdCases = Object.freeze([...Array.from({ length: 9 }, (_, index) => 500 + index * 300), 3000].map(delay => ({
  id: `delay-${delay}`,
  delay,
  label: `${(delay / 1000).toFixed(1)}s`,
})))

const switchValue = ref(false)
const pillValue = ref(false)
const selectValue = ref(selectOptions[0])
const smartSelectValue = ref(smartSelectItems[0].value)
const dropdownValue = ref(dropdownItems[1].value)
const sliderCoarseValue = ref(50)
const sliderFineValue = ref(0.5)
const sliderExtendedValue = ref(50)
const inputTextValue = ref("Garage")
const inputNumberValue = ref(2)
const rowActivationCount = ref(0)
const selectedTileId = ref(tileCases[0].id)
const selectedListCardId = ref(listCards[0].id)
const tabsValue = ref(0)
const drawerExpanded = ref(false)
const holdStatuses = ref(Object.fromEntries(holdCases.map(holdCase => [holdCase.id, "Idle"])))
const menuStatus = ref("Menu closed")
const popoverStatus = ref("Popover closed")
const lastAction = ref("None")

let holdActive = false
let holdCompleted = false
let activeHoldCase = null

async function onBreadcrumbClick(item) {
  if (!item?.routeName || item.decorator || item.abstract) return
  await lua.extensions.ui_router.navigate(item.routeName, item.params)
}

async function onBreadcrumbBack() {
  await lua.extensions.ui_router.back()
}

function recordAction(label) {
  lastAction.value = label
}

function playHoldEvent(eventName, holdCase = activeHoldCase) {
  if (!holdCase) return
  lua.ui_audio.playEventSound(holdSoundClass, eventName, getHoldInstanceId(holdCase))
}

function getHoldInstanceId(holdCase) {
  return holdInstanceId
}

function setHoldStatus(holdCase, status) {
  if (!holdCase) return
  holdStatuses.value[holdCase.id] = status
}

function playOneShot(soundClass, eventName, label) {
  recordAction(label)
  lua.ui_audio.playEventSound(soundClass, eventName)
}

function onDropdownValueChanged(value) {
  recordAction(`BngDropdown: ${value}`)
  lua.ui_audio.playEventSound("bng_click_hover_generic", "click")
}

function onTextInputFocus() {
  playOneShot("bng_click_hover_generic", "focus", "BngInput text focus")
}

function onTextInputEnter(value) {
  playOneShot("bng_click_hover_generic", "click", `BngInput text enter: ${value}`)
}

function onPlainRowActivate() {
  rowActivationCount.value += 1
  recordAction(`BngRow activation ${rowActivationCount.value}`)
}

function onNestedRowButtonActivate() {
  playOneShot("bng_click_generic", "click", "BngRow nested button")
}

function selectTile(tile) {
  selectedTileId.value = tile.id
  recordAction(`BngTile: ${tile.label}`)
}

function selectListCard(card) {
  selectedListCardId.value = card.id
  recordAction(`BngList card: ${card.label}`)
}

function onTabsChange(tab) {
  recordAction(`BngTabs: ${tab?.heading || "unknown"}`)
}

function onDrawerChange(expanded) {
  recordAction(`BngDrawer: ${expanded ? "expanded" : "collapsed"}`)
}

function isPrimaryInteraction(event) {
  return !event || event.fromController || event.button === 0
}

function startHoldSound(event, holdCase) {
  if (!isPrimaryInteraction(event)) return

  holdActive = true
  holdCompleted = false
  activeHoldCase = holdCase
  setHoldStatus(holdCase, "Hold started")
  playHoldEvent("start", holdCase)
}

function completeHoldSound(holdCase) {
  if (!holdActive || holdCompleted || activeHoldCase !== holdCase) return

  holdCompleted = true
  setHoldStatus(holdCase, "Hold completed")
  recordAction(`Hold completed: ${holdCase.label}`)
  playHoldEvent("complete", holdCase)
}

function endHoldSound(event, holdCase = activeHoldCase) {
  if (!isPrimaryInteraction(event) || !holdActive || activeHoldCase !== holdCase) return

  if (!holdCompleted) {
    cancelHoldSound(event, holdCase)
    return
  }

  resetHoldState()
}

function cancelHoldSound(event = undefined, holdCase = activeHoldCase) {
  if (!holdActive || activeHoldCase !== holdCase) return

  if (!holdCompleted) {
    setHoldStatus(holdCase, "Hold cancelled")
    recordAction(`Hold cancelled: ${holdCase?.label}`)
    playHoldEvent("cancel", holdCase)
  }

  resetHoldState()
}

function resetHoldState() {
  holdActive = false
  holdCompleted = false
  activeHoldCase = null
}

function setMenuStatus(isOpen) {
  menuStatus.value = isOpen ? "Menu open" : "Menu closed"
}

function setPopoverStatus(isOpen) {
  popoverStatus.value = isOpen ? "Popover open" : "Popover closed"
}

onBeforeUnmount(() => {
  if (holdActive && !holdCompleted) playHoldEvent("cancel")
  resetHoldState()
})
</script>

<style scoped lang="scss">
.ui-sounds-demo {
  --content-flow: column;
  --content-max-width: unset;
  color: var(--bng-off-white);
  min-height: 0;
}

:deep(.layout-menu.ui-sounds-demo),
:deep(.layout-menu.ui-sounds-demo > .layout-content),
:deep(.layout-menu.ui-sounds-demo .menu-screen),
:deep(.layout-menu .menu-screen.ui-sounds-demo) {
  height: 100%;
  min-height: 0;
}

:deep(.layout-menu.ui-sounds-demo .menu-content),
:deep(.layout-menu .menu-screen.ui-sounds-demo .menu-content) {
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
}

:deep(.layout-menu.ui-sounds-demo .menu-content-main),
:deep(.layout-menu .menu-screen.ui-sounds-demo .menu-content-main) {
  flex: 1 1 0;
  align-items: stretch;
  min-height: 0;
  overflow: hidden;
}

.ui-sounds-demo__content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1 1 auto;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0 0.25rem 0.5rem 0;
  scrollbar-gutter: stable;
}

.ui-sounds-demo__intro {
  --bng-bg-enabled: var(--bng-cool-gray-900);
  --bng-bg-enabled-opacity: 0.78;
  --bng-bg-border-enabled: rgba(var(--bng-off-white-rgb), 0.16);
  --bng-bg-border-width: 1px;
  --bng-bg-border-radius: var(--bng-corners-2);

  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 56rem;
  padding: 1rem;

  p {
    max-width: 48rem;
    padding: 0;
    margin: 0;
    color: var(--bng-cool-gray-100);
  }
}

.ui-sounds-demo__intro .ui-sounds-demo__eyebrow {
  color: var(--bng-orange-300);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.ui-sounds-demo__legend {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: 0.5rem;

  span {
    padding: 0.5rem;
    color: var(--bng-cool-gray-100);
    background: rgba(var(--bng-cool-gray-800-rgb), 0.48);
    border: 1px solid rgba(var(--bng-off-white-rgb), 0.08);
    border-radius: var(--bng-corners-1);
  }

  strong {
    display: block;
    color: var(--bng-off-white);
  }

  code {
    color: var(--bng-orange-200);
  }
}

.ui-sounds-demo__future-defaults {
  font-size: 0.9rem;
}

.ui-sounds-demo__sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(25rem, 1fr));
  gap: 1rem;
  max-width: 96rem;
  padding-bottom: 0.5rem;
}

.ui-sounds-demo__card {
  --bng-bg-enabled: var(--bng-cool-gray-900);
  --bng-bg-enabled-opacity: 0.78;
  --bng-bg-border-enabled: rgba(var(--bng-off-white-rgb), 0.16);
  --bng-bg-border-width: 1px;
  --bng-bg-border-radius: var(--bng-corners-2);

  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 9rem;
  padding: 1rem;

  h2 {
    padding: 0;
    margin: 0;
    font-size: 1.2rem;
  }

  p {
    padding: 0;
    margin: 0;
    color: var(--bng-cool-gray-200);
  }
}

.ui-sounds-demo__note {
  font-size: 0.9rem;

  code {
    color: var(--bng-orange-200);
  }
}

.ui-sounds-demo__rows {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.ui-sounds-demo__row {
  display: grid;
  grid-template-columns: minmax(12rem, 0.9fr) minmax(14rem, 1.1fr);
  gap: 0.75rem;
  align-items: center;
  padding: 0.625rem;
  border: 1px solid rgba(var(--bng-off-white-rgb), 0.08);
  border-radius: var(--bng-corners-1);
  background: rgba(var(--bng-cool-gray-800-rgb), 0.42);
}

.ui-sounds-demo__control {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.ui-sounds-demo__control .ui-sounds-demo__status {
  flex-basis: 100%;
}

.ui-sounds-demo__control--wide {
  min-width: 0;

  > * {
    width: min(100%, 20rem);
  }
}

.ui-sounds-demo__bng-row {
  width: min(100%, 20rem);
  margin: 0;
}

.ui-sounds-demo__tile {
  --bng-tile-margins: 0;
  width: 5.25rem;
  min-width: 5.25rem;
  cursor: pointer;

  &.active {
    box-shadow: inset 0 0 0 2px var(--bng-orange-500);
  }
}

.ui-sounds-demo__compact-list {
  height: 6.5rem;
}

.ui-sounds-demo__list-card {
  --bng-card-content-gap: 0.125rem;
  --bng-card-content-padding: 0.45rem 0.6rem;

  color: var(--bng-off-white);
  cursor: pointer;

  &.active {
    box-shadow: inset 0 0 0 2px var(--bng-orange-500);
  }

  span {
    color: var(--bng-cool-gray-200);
    font-size: 0.8rem;
  }
}

.ui-sounds-demo__tabs {
  height: 5.5rem;
  --tab-list-justify: flex-start;

  :deep(.tab-content) {
    padding: 0.5rem;
    color: var(--bng-cool-gray-100);
  }
}

.ui-sounds-demo__drawer {
  :deep(.header) {
    min-height: auto;
    margin: 0.25rem 0.5rem 0.25rem 0;
    font-size: 1rem;
  }

  span {
    display: inline-flex;
    padding: 0.5rem;
    color: var(--bng-cool-gray-100);
  }
}

.ui-sounds-demo__meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
  color: var(--bng-cool-gray-100);
  font-size: 0.9rem;

  strong {
    color: var(--bng-off-white);
  }

  span {
    overflow-wrap: anywhere;
  }

  code {
    color: var(--bng-orange-200);
  }
}

.ui-sounds-demo__status,
.ui-sounds-demo__last-action {
  color: var(--bng-cool-gray-200);
  font-size: 0.9rem;
}

.ui-sounds-demo__status {
  min-height: 1.25rem;
  line-height: 1.25rem;
}

.ui-sounds-demo__last-action {
  width: fit-content;
  padding: 0.5rem 0.75rem;
  border-radius: var(--bng-corners-1);
  background: rgba(var(--bng-cool-gray-900-rgb), 0.72);
}

.ui-sounds-demo__popover-panel {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 14rem;
  padding: 0.75rem;
  color: var(--bng-off-white);
  background: var(--bng-ter-blue-gray-700);
  border-radius: var(--bng-corners-1);
}

@media (max-width: 52rem) {
  .ui-sounds-demo__sections {
    grid-template-columns: minmax(0, 1fr);
  }

  .ui-sounds-demo__row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
