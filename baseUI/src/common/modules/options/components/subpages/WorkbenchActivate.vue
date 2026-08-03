<template>
  <div class="workbench-activate">
    <div class="wb-card">
      <div class="wb-head">
        <div class="wb-text">
          <div class="wb-title">{{ $tt("ui.options.workbench.mobileTitle") }}</div>
          <div class="wb-desc">{{ $tt("ui.options.workbench.mobileDesc") }}</div>
        </div>
        <BngPillCheckbox v-model="mobile" marked-icon @change="toggleMobile">{{ mobile ? "On" : "Off" }}</BngPillCheckbox>
      </div>
      <div class="wb-explain">{{ $tt("ui.options.workbench.explain") }}</div>
      <div class="wb-head">
        <div class="wb-text">
          <div class="wb-title">{{ $tt("ui.options.workbench.insecureTitle") }}</div>
          <div class="wb-desc">{{ $tt("ui.options.workbench.insecureDesc") }}</div>
        </div>
        <BngPillCheckbox v-model="insecure" marked-icon @change="toggleInsecure">{{ insecure ? "On" : "Off" }}</BngPillCheckbox>
      </div>
      <div v-if="tls" class="wb-cert-warn">
        <BngIcon class="wb-cert-icon" :type="icons.warning" />
        <span>{{ $tt("ui.options.workbench.certWarning") }}</span>
      </div>
      <div v-if="mobile && lanError" class="wb-cert-warn">
        <BngIcon class="wb-cert-icon" :type="icons.warning" />
        <span>{{ lanError }}</span>
      </div>
      <div v-else-if="mobile" class="wb-qr">
        <div ref="qrEl" class="wb-qr-img"></div>
        <div class="wb-qr-info">
          <a class="wb-url" :href="localUrl" @click.prevent="openLocal">
            <BngIcon class="wb-url-icon" :type="icons.external" />
            <span class="wb-url-text">{{ url }}</span>
          </a>
          <div class="wb-warn"><BngIcon :type="icons.warning" /><span>{{ $tt("ui.options.workbench.lanWarning") }}</span></div>
        </div>
      </div>
      <div v-if="mobile" class="wb-help">
        <div class="wb-help-title">
          <BngIcon class="wb-help-icon" :type="icons.info" />
          <span>{{ $tt("ui.options.workbench.troubleshootTitle") }}</span>
        </div>
        <ul class="wb-help-list">
          <li>{{ $tt("ui.options.workbench.troubleshootSameNetwork") }}</li>
          <li>{{ $tt("ui.options.workbench.troubleshootWinNetwork") }}</li>
          <li>{{ $tt("ui.options.workbench.troubleshootFirewall") }}</li>
        </ul>
      </div>
    </div>

    <div class="wb-card">
      <div class="wb-text">
        <div class="wb-title">{{ $tt("ui.options.workbench.channelsTitle") }}</div>
        <div class="wb-desc">{{ $tt("ui.options.workbench.channelsDesc") }}</div>
      </div>
      <div v-if="!channels.length" class="wb-ch-none">{{ $tt("ui.options.workbench.channelsNone") }}</div>
      <ul v-else class="wb-ch-list">
        <li v-for="c in channels" :key="c.port" class="wb-ch-row">
          <div class="wb-ch-head">
            <div class="wb-ch-id">
              <span class="wb-ch-name">{{ c.name }}</span>
              <span class="wb-ch-port">:{{ c.port }}</span>
            </div>
            <div class="wb-ch-proto">
              <span v-if="c.hasWs" class="wb-ch-badge" :class="c.secure ? 'is-secure' : 'is-insecure'">{{ c.wsScheme }}</span>
              <span class="wb-ch-badge" :class="c.secure ? 'is-secure' : 'is-insecure'">{{ c.httpScheme }} VFS</span>
            </div>
            <div class="wb-ch-meta">
              <span>{{ $tt(c.bind) }}</span>
              <span class="wb-ch-peers">{{ c.clients.length }} {{ $tt("ui.options.workbench.channelsClients") }}</span>
            </div>
          </div>
          <ul v-if="c.clients.length" class="wb-ch-clients">
            <li v-for="cl in c.clients" :key="cl.id" class="wb-ch-client">
              <span class="wb-ch-cid">#{{ cl.id }}</span>
              <span class="wb-ch-cname">{{ cl.name }}</span>
            </li>
          </ul>
          <div v-else class="wb-ch-noclients">{{ $tt("ui.options.workbench.channelsNoClients") }}</div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from "vue"
import { BngPillCheckbox, BngIcon, icons } from "@/common/components/base"

const mobile = ref(false)
const insecure = ref(false)
const tls = ref(false)
const url = ref("")
const localUrl = ref("")
const lanError = ref("")
const qrEl = ref(null)
const servers = ref([])

// Persist the "Mobile (QR code)" setting. The GE settings handler loads
// workbench_webSocketHandler and binds it LAN-visible when on (and again at game
// start), so the toggle survives a restart. Returns the resulting bind state for
// the QR. engineLua embeds one expression, so the set+read is wrapped in an IIFE.
function setMobile(on) {
  return new Promise(resolve =>
    bngApi.engineLua(`(function() settings.setState({workbenchMobile=${on}}) return workbench_webSocketHandler and workbench_webSocketHandler.getStatus() or nil end)()`, resolve))
}

// HTTPS/WSS is the default; this opt-out serves plain ws/http (for devices that can't
// accept the self-signed cert). Rebinds a running server, so re-read the bind state.
function setInsecure(on) {
  return new Promise(resolve =>
    bngApi.engineLua(`(function() settings.setState({workbenchInsecure=${on}}) return workbench_webSocketHandler and workbench_webSocketHandler.getStatus() or nil end)()`, resolve))
}

// Every server the game is hosting right now (port/scheme/subprotocol/peers), so
// the user can audit which channels serve ws/wss + http/https for the VFS.
function refreshServers() {
  bngApi.engineLua(`BNGWebWSServer.listServers()`, list => { servers.value = Array.isArray(list) ? list : [] })
}

const channels = computed(() => (servers.value || []).map(s => ({
  port: s.port,
  secure: !!s.tls,
  hasWs: !!(s.wsServiceName && s.wsServiceName !== ""),
  wsScheme: s.tls ? "wss" : "ws",
  httpScheme: s.tls ? "https" : "http",
  name: (s.wsServiceName && s.wsServiceName !== "") ? s.wsServiceName : (s.httpRoute && s.httpRoute !== "" ? s.httpRoute : "VFS"),
  bind: (!s.listenIP || s.listenIP === "0.0.0.0" || s.listenIP === "any") ? "ui.options.workbench.channelsLan" : "ui.options.workbench.channelsLocal",
  clients: Array.isArray(s.clients) ? s.clients : [],
})))

// Current bind state without (re)starting the server, so reopening this page
// reflects a LAN session still live from a previous visit.
function getStatus() {
  return new Promise(resolve =>
    bngApi.engineLua(`(function() return workbench_webSocketHandler and workbench_webSocketHandler.getStatus() or nil end)()`, resolve))
}

// The QR renderer is a vendored global; load it on demand if the host page hasn't.
function ensureQRCode() {
  if (window.QRCode) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const s = document.createElement("script")
    s.src = "/ui/lib/ext/qrcode.min.js"
    s.onload = resolve
    s.onerror = reject
    document.head.appendChild(s)
  })
}

// Render the QR + URL for a LAN-reachable address. LAN binds serve over TLS
// (self-signed) so the phone gets a secure context, so use https there.
async function showQR(address, port, secure) {
  tls.value = !!secure
  const scheme = secure ? "https" : "http"
  url.value = `${scheme}://${address}:${port}/vfs/workbench/web/index.html`
  localUrl.value = `${scheme}://localhost:${port}/vfs/workbench/web/index.html`
  await ensureQRCode()
  await nextTick()
  if (qrEl.value && window.QRCode) {
    qrEl.value.innerHTML = ""
    new QRCode(qrEl.value, { text: url.value, width: 200, height: 200, correctLevel: QRCode.CorrectLevel.M })
  }
}

// Open on this PC. localhost (not the LAN IP shown in the QR) sidesteps CEF's
// URL domain filter; the server listens locally even when bound for LAN.
function openLocal() {
  if (!localUrl.value) return
  bngApi.engineLua(`openWebBrowser(${JSON.stringify(localUrl.value)})`)
}

// Reflect a server status: QR for a working LAN bind, or explain why it's local-only.
async function applyStatus(s) {
  if (s && s.lan && s.address) { lanError.value = ""; await showQR(s.address, s.port, s.tls) }
  else { url.value = ""; localUrl.value = ""; tls.value = false; lanError.value = (s && s.error) || "" }
}

async function toggleMobile(on) {
  if (!on) { url.value = ""; localUrl.value = ""; tls.value = false; lanError.value = ""; await setMobile(false); refreshServers(); return }
  await applyStatus(await setMobile(true))
  refreshServers()
}

async function toggleInsecure(on) {
  const info = await setInsecure(on)
  if (mobile.value) await applyStatus(info)
  refreshServers()
}

// The toggle reflects the persisted setting (user intent); the server itself may also
// be up via the desktop app. Poll so connecting/leaving clients show up live in the
// summary while the page is open.
let serversTimer = null
onMounted(async () => {
  refreshServers()
  serversTimer = setInterval(refreshServers, 2000)
  const init = await new Promise(resolve => bngApi.engineLua(
    `(function() return { mobile = settings.getValue('workbenchMobile'), insecure = settings.getValue('workbenchInsecure'), status = workbench_webSocketHandler and workbench_webSocketHandler.getStatus() or nil } end)()`, resolve))
  mobile.value = !!(init && init.mobile)
  insecure.value = !!(init && init.insecure)
  if (mobile.value && init.status) await applyStatus(init.status)
})
onUnmounted(() => { if (serversTimer) clearInterval(serversTimer) })
</script>

<style lang="scss" scoped>
.workbench-activate {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}
.wb-card {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.25rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 0.5rem;
}
.wb-explain {
  font-size: 0.95rem;
  line-height: 1.45;
  opacity: 0.85;
}
.wb-head {
  display: flex;
  align-items: center;
  gap: 1rem;

  > .wb-text {
    flex: 1;
  }
}
.wb-cert-warn {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--bng-orange-500);
  border-radius: 0.25rem;
  background: rgba(255, 102, 0, 0.12);
  font-weight: 600;
  line-height: 1.3;

  > .wb-cert-icon {
    flex: 0 0 auto;
    font-size: 1.5rem;
    color: var(--bng-orange-500);
  }
}
.wb-title {
  font-weight: 600;
}
.wb-desc {
  opacity: 0.7;
  font-size: 0.9rem;
}
.wb-qr {
  display: flex;
  align-items: center;
  gap: 1rem;

  > .wb-qr-img {
    background: #fff;
    padding: 0.5rem;
    border: 4px solid #fff;
    border-radius: 0.25rem;
    line-height: 0;
  }

  > .wb-qr-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;

    > .wb-url {
      display: inline-flex;
      align-items: center;
      max-width: 100%;
      gap: 0.5rem;
      padding: 0.4rem 0.7rem;
      border-radius: 0.25rem;
      background: rgba(255, 255, 255, 0.08);
      color: var(--bng-off-white);
      font-family: var(--fnt-mono);
      font-size: 0.9rem;
      text-decoration: none;
      cursor: pointer;
      transition: background-color 0.12s ease, color 0.12s ease;

      > .wb-url-icon { flex: 0 0 auto; }
      > .wb-url-text { overflow-wrap: anywhere; }

      &:hover {
        background: var(--bng-orange);
        color: #000;
      }
    }

    > .wb-warn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
      opacity: 0.85;
    }
  }
}
.wb-help {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
.wb-help-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;

  > .wb-help-icon {
    flex: 0 0 auto;
    color: var(--bng-off-white);
  }
}
.wb-help-list {
  margin: 0;
  padding-left: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.9rem;
  opacity: 0.85;
  line-height: 1.35;
}
.wb-ch-none {
  font-size: 0.9rem;
  opacity: 0.7;
}
.wb-ch-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.wb-ch-row {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 0.25rem;
}
.wb-ch-head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.wb-ch-id {
  flex: 1 1 30%;
  min-width: 0;
  font-family: var(--fnt-mono);
  font-size: 0.9rem;

  > .wb-ch-port {
    opacity: 0.6;
  }
}
.wb-ch-proto {
  display: flex;
  gap: 0.4rem;
  flex: 0 0 auto;
}
.wb-ch-clients {
  list-style: none;
  margin: 0;
  padding: 0 0 0 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-left: 2px solid rgba(255, 255, 255, 0.1);
  margin-left: 0.25rem;
}
.wb-ch-client {
  display: flex;
  gap: 0.5rem;
  font-family: var(--fnt-mono);
  font-size: 0.8rem;

  > .wb-ch-cid {
    opacity: 0.55;
  }
}
.wb-ch-noclients {
  padding-left: 1.5rem;
  font-size: 0.78rem;
  opacity: 0.5;
}
.wb-ch-badge {
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  font-family: var(--fnt-mono);
  font-size: 0.78rem;

  &.is-secure {
    background: rgba(34, 197, 94, 0.18);
    color: #4ade80;
  }
  &.is-insecure {
    background: rgba(255, 255, 255, 0.1);
    opacity: 0.85;
  }
}
.wb-ch-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  flex: 1 1 25%;
  text-align: right;
  font-size: 0.8rem;
  opacity: 0.8;

  > .wb-ch-peers {
    font-size: 0.72rem;
    opacity: 0.8;
  }
}
</style>
