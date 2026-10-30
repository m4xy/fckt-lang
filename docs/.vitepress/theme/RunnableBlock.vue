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
  <div class="fckt-runnable-bar">
    <button type="button" class="fckt-run" :disabled="running" @click="start">
      <svg aria-hidden="true" viewBox="0 0 16 16" width="12" height="12"><path d="M4 2.5v11l9-5.5z" fill="currentColor" /></svg>
      {{ running ? 'Running…' : 'Run' }}
    </button>
    <button v-if="!editing" type="button" class="fckt-secondary" @click="edit">Edit</button>
    <button v-else type="button" class="fckt-secondary" @click="reset">Reset</button>
  </div>
  <div v-if="outcome" class="fckt-output" :class="outcome.kind" role="status">
    <pre v-if="outcome.text">{{ outcome.text }}</pre>
    <p v-else>Printed nothing.</p>
  </div>
</template>
