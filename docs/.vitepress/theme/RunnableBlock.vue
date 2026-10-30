<script setup lang="ts">
import { nextTick, ref } from 'vue'
import FcktEditor from './FcktEditor.vue'
import { run, type Outcome } from './runner'

// The Run and Edit controls under one of the docs' examples, and what running it printed.
const props = defineProps<{ wrapper: HTMLElement; original: string; context: string[][] }>()
const code = ref(props.original)
const editing = ref(false)
const running = ref(false)
const outcome = ref<Outcome | null>(null)
const editor = ref<InstanceType<typeof FcktEditor>>()

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
      <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14"><path d="M4.5 2.5v11l9-5.5z" fill="currentColor" /></svg>
    </button>
    <button v-if="!editing" type="button" class="fckt-icon fckt-secondary" aria-label="Edit" title="Edit" @click="edit">
      <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M10.5 2.5l3 3-8 8H2.5v-3z" /><path d="M9 4l3 3" /></svg>
    </button>
    <button v-else type="button" class="fckt-icon fckt-secondary" aria-label="Reset" title="Reset" @click="reset">
      <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 3v3.5H6" /><path d="M3 9.5a5 5 0 1 0 .9-4.6L2.5 6.5" /></svg>
    </button>
  </div>
  <div v-if="outcome" class="fckt-output" :class="outcome.kind" role="status">
    <pre v-if="outcome.text">{{ outcome.text }}</pre>
    <p v-else>Printed nothing.</p>
  </div>
</template>
