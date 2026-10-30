<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import FcktEditor from './FcktEditor.vue'
import { run, type Outcome } from './runner'

// The Run and Edit controls under one of the docs' examples, and what running it printed.
const props = defineProps<{ wrapper: HTMLElement; original: string; context: string[][] }>()
const code = ref(props.original)
const editing = ref(false)
const running = ref(false)
const outcome = ref<Outcome | null>(null)
const editor = ref<InstanceType<typeof FcktEditor>>()
// The code block's lower corners square off while the output is joined to it.
watch(outcome, value => props.wrapper.classList.toggle('has-output', !!value))

async function start() {
  if (running.value) return
  running.value = true
  outcome.value = null
  try {
    outcome.value = await run(code.value, props.context)
  } catch (e) {
    outcome.value = { kind: 'error', text: `Couldn't run this here: ${(e as Error).message}` }
  } finally {
    running.value = false
  }
}

async function edit() {
  editing.value = true
  props.wrapper.classList.add('editing')
  await nextTick()
  editor.value?.focus()
}

function reset() {
  code.value = props.original
  editing.value = false
  outcome.value = null
  props.wrapper.classList.remove('editing')
}
</script>

<template>
  <div v-if="editing" class="fckt-runnable-editor fckt-glass-ring">
    <FcktEditor v-model="code" label="Edit this example" @run="start" />
  </div>
  <div class="fckt-runnable-controls" :class="{ shown: editing || running }">
    <button type="button" class="fckt-icon fckt-run" :aria-label="running ? 'Running' : 'Run'" :title="running ? 'Running…' : 'Run'" :aria-busy="running" :disabled="running" @click="start">
      <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L7.5 3.64A1 1 0 0 0 6 4.5z" /></svg>
    </button>
    <button v-if="!editing" type="button" class="fckt-icon fckt-secondary" aria-label="Edit" title="Edit" @click="edit">
      <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.17 6.81a2.82 2.82 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z" /><path d="m15 5 4 4" /></svg>
    </button>
    <button v-else type="button" class="fckt-icon fckt-secondary" aria-label="Reset" title="Reset" @click="reset">
      <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
    </button>
  </div>
  <div v-if="outcome" class="fckt-output" :class="outcome.kind" role="status">
    <span class="fckt-output-label">{{ outcome.kind === 'printed' ? 'output' : 'error' }}</span>
    <pre v-if="outcome.text">{{ outcome.text }}</pre>
    <p v-else>Printed nothing.</p>
  </div>
</template>
