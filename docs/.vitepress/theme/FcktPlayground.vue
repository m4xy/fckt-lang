<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import FcktEditor from './FcktEditor.vue'
import { examples } from './playground-examples'
import { run, type Outcome } from './runner'

// A whole program to edit and run. The program is kept in the page's address when shared, and in
// this browser between visits.
const SAVED = 'fckt-playground'
const code = ref(examples[0].code)
const running = ref(false)
const outcome = ref<Outcome | null>(null)
const copied = ref(false)
const example = ref('')

const encode = (text: string) => btoa(String.fromCharCode(...new TextEncoder().encode(text))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const decode = (text: string) => new TextDecoder().decode(Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)))

onMounted(() => {
  const shared = location.hash.match(/^#code=(.+)$/)
  if (shared) {
    try { code.value = decode(shared[1]) } catch { /* a damaged link opens the first example */ }
  } else {
    try { code.value = localStorage.getItem(SAVED) ?? code.value } catch { /* storage may be blocked */ }
  }
})
watch(code, value => {
  try { localStorage.setItem(SAVED, value) } catch { /* storage may be blocked */ }
})

function choose() {
  const chosen = examples.find(e => e.name === example.value)
  if (chosen) code.value = chosen.code
  outcome.value = null
  example.value = ''
}

async function start() {
  if (running.value) return
  running.value = true
  outcome.value = null
  try {
    outcome.value = await run(code.value)
  } catch (e) {
    outcome.value = { kind: 'error', text: `Couldn't run this here: ${(e as Error).message}` }
  } finally {
    running.value = false
  }
}

async function share() {
  const link = `${location.origin}${location.pathname}#code=${encode(code.value)}`
  history.replaceState(null, '', link)
  try {
    await navigator.clipboard.writeText(link)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch { /* the link is in the address bar either way */ }
}
</script>

<template>
  <div class="fckt-playground">
    <div class="fckt-playground-bar">
      <button type="button" class="fckt-run" :disabled="running" @click="start">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L7.5 3.64A1 1 0 0 0 6 4.5z" /></svg>
        {{ running ? 'Running…' : 'Run' }}
      </button>
      <label class="fckt-examples">
        <span class="visually-hidden">Open an example</span>
        <select v-model="example" @change="choose">
          <option value="" disabled>Examples</option>
          <option v-for="e in examples" :key="e.name" :value="e.name">{{ e.name }}</option>
        </select>
      </label>
      <button type="button" class="fckt-secondary" @click="share">{{ copied ? 'Link copied' : 'Share' }}</button>
      <span class="fckt-hint">Ctrl or ⌘ + Enter runs it</span>
    </div>
    <div class="fckt-playground-panes">
      <div class="fckt-playground-editor fckt-glass-ring">
        <FcktEditor v-model="code" label="Program" :min-lines="18" @run="start" />
      </div>
      <div class="fckt-playground-output" :class="outcome?.kind" role="status" aria-live="polite">
        <span class="fckt-output-label">{{ outcome && outcome.kind !== 'printed' ? 'error' : 'output' }}</span>
        <p v-if="running" class="fckt-quiet">Compiling and running…</p>
        <p v-else-if="!outcome" class="fckt-quiet">What the program prints shows here. The first run loads the compiler, so it takes a moment longer.</p>
        <pre v-else-if="outcome.text">{{ outcome.text }}</pre>
        <p v-else class="fckt-quiet">Printed nothing.</p>
      </div>
    </div>
  </div>
</template>
