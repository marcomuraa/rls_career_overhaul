<template>
  <div class="message-container">
    <div class="message" :class="['message', animationClass, fontSizeClass]">
      {{ txt }}
    </div>
  </div>
</template>

<script setup>
import { useEvents } from '@/services/events'
import { ref, onMounted, onUnmounted } from 'vue'
import { useBridge } from '@/bridge'
import { $translate } from '@/services'

const props = defineProps({
  messageSource: {
    type: String,
    default: 'ScenarioFlashMessage',
  }
})

const events = useEvents()
const { api } = useBridge()
const txt = ref('')
const messageQueue = ref([])
const stepTimeout = ref(null)
const fadeInTimeout = ref(null)
const fadeOutTimeout = ref(null)
const animationClass = ref('')
const fontSizeClass = ref('font-small')
const paused = ref(false)

function resolveMessageText(message) {
  if (message === null || typeof message === 'undefined') return ''
  if (typeof message === 'number') return String(message)
  if (typeof message === 'string' || typeof message === 'object') {
    return $translate.contextTranslate(message)
  }

  return String(message)
}

onMounted(() => {
  events.on(props.messageSource, (data) => {
    const clearQueue = Array.isArray(data)
      ? data.some(item => item[4])
      : (typeof data === 'object' && data.clearQueue)

    if (clearQueue) {
      clearAllTimeouts()
      messageQueue.value = []
    }

    // Check if data is an array or an object
    if (Array.isArray(data)) {
      // If the data is an array, map it to an object
      data.forEach((item) => {
        messageQueue.value.push({
          msg: item[0],                 // First element as the actual message
          ttl: item[1],                 // Second element as the time-to-live (in seconds)
          luaCall: item[2] && typeof item[2] === 'string' ? item[2] : undefined,  // Lua call if provided and is a string
          jsCallback: item[2] && typeof item[2] === 'function' ? item[2] : undefined, // JS callback if provided and is a function
          big: item[3] !== undefined ? item[3] : false // Fourth element as "big" flag, defaults to false if not provided
        })
      });
    } else if (typeof data === 'object') {
      // If the data is an object, directly push it into the queue
      messageQueue.value.push({
        msg: data.msg,                                 // The actual message
        ttl: data.ttl,                                 // Time-to-live (in seconds)
        luaCall: data.luaCall || undefined,            // Lua call if provided
        jsCallback: data.jsCallback || undefined,      // JS callback if provided
        big: data.big !== undefined ? data.big : false // "big" flag, defaults to false if not provided
      })
    } else {
      console.warn('Unexpected data format received for FlashMessage')
    }

    // Start the animation if no current animation is in progress
    if (messageQueue.value.length > 0 && !stepTimeout.value) {
      playMessagesAnimation()
    }
  })

  events.on('physicsStateChanged', (state) => {
    paused.value = !state;
    if (paused.value) {
      clearAllTimeouts()
    } else if (state) {
      playMessagesAnimation(); // Resume message animation if not paused
    }
  });
})

onUnmounted(() => {
  clearAllTimeouts()
})

function playMessagesAnimation() {
  if (messageQueue.value.length === 0) {
    resetCountdown()
    return
  }

  // Start the animation for the first message
  animationClass.value = 'fade-in' // Apply fade-in class

  fadeInTimeout.value = setTimeout(() => {
    animationClass.value = '' // Remove fade-in after it's done
  }, 200)

  const msg = messageQueue.value[0]

  // Set the text and font size class
  txt.value = resolveMessageText(msg.msg) // Set translated or plain message text
  fontSizeClass.value = msg.big ? 'font-large' : 'font-small' // Set large or default font size class based on 'big' property

  // Handle Lua call if provided
  if (msg.luaCall && typeof msg.luaCall === 'string') {
    api.engineLua(msg.luaCall) // Assuming `bngApi` is accessible globally
  }

  // Handle JavaScript callback if provided
  if (msg.jsCallback && typeof msg.jsCallback === 'function') {
    msg.jsCallback() // Execute the callback function
  }

  // Remove the processed message from the queue
  messageQueue.value.shift()


  // Set fade-out animation
  fadeOutTimeout.value = setTimeout(() => {
    animationClass.value = 'fade-out';
  }, (msg.ttl * 1000) - 200)

  // Set the timeout for the next message
  stepTimeout.value = setTimeout(() => {
    playMessagesAnimation();
  }, msg.ttl * 1000)
}

function clearAllTimeouts() {
  if (stepTimeout.value) { clearTimeout(stepTimeout.value); stepTimeout.value = null }
  if (fadeInTimeout.value) { clearTimeout(fadeInTimeout.value); fadeInTimeout.value = null }
  if (fadeOutTimeout.value) { clearTimeout(fadeOutTimeout.value); fadeOutTimeout.value = null }
}

// Reset the message queue and clear the timeout
function resetCountdown() {
  clearAllTimeouts()
  messageQueue.value = []
  txt.value = ''
}

</script>

<style lang="scss" scoped>
.message-container {
  min-height: 4rem;

  @keyframes message-fade-in {
    0% {
      opacity: 0;
      text-shadow: 0px 0px 2rem var(--bng-off-white);
      transform: scale(1.3);
    }
    100% {
      opacity: 1;
      text-shadow: 0px 0px 0rem var(--bng-off-white);
      transform: scale(1);
    }
  }

  @keyframes message-fade-out {
    0% {
      opacity: 1;
      text-shadow: 0px 0px 0rem var(--bng-off-white);
      transform: scale(1);
    }
    100% {
      opacity: 0;
      text-shadow: 0px 0px 3rem var(--bng-off-white);
      transform: scale(0);
    }
  }

  .message {
    font-family: 'Overpass', var(--fnt-defs);
    font-weight: 700;
    font-style: italic;
    text-align: center;
    line-height: 1.1em;
    margin: 0.5rem 0 0 0;
    padding: 0.25rem 1rem;
    color: var(--flash-message-color, var(--bng-off-white));
    &.font-small {
      font-size: 2.25rem;
    }
    &.font-large {
      font-size: 4.8rem;
    }
    &.fade-in {
      animation: message-fade-in 0.2s 1 backwards;
    }
    &.fade-out {
      animation: message-fade-out 0.2s 1;
    }
    filter: drop-shadow(0px 0px 0.25rem var(--bng-black-o4));
  }
}
</style>
