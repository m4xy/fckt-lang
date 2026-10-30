<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import FcktEditor from './FcktEditor.vue'
import { check, isWarm, type Checked } from './runner'
import { markDone, isDone } from './progress'

// A lesson's task: an editor with the starting code, Check, hints one at a time, and the solution
// once the reader has tried a couple of times. What they've written is kept in this browser.
const props = defineProps<{ path: string; starter: string; solution: string; test: string; hints: string[] }>()
const SAVED = `fckt-lesson:${props.path}`
const code = ref(props.starter)
const checking = ref(false)
const result = ref<Checked | null>(null)
const attempts = ref(0)
const hintsShown = ref(0)
const done = ref(false)
const canShowSolution = computed(() => attempts.value >= 2 && !done.value)

onMounted(() => {
  done.value = isDone(props.path)
  try { code.value = localStorage.getItem(SAVED) ?? props.starter } catch { /* storage may be blocked */ }
})
watch(code, value => {
  try { localStorage.setItem(SAVED, value) } catch { /* storage may be blocked */ }
})

async function start() {
  if (checking.value) return
  checking.value = true
  result.value = null
  try {
    result.value = await check(code.value, props.test)
  } catch (e) {
    result.value = { kind: 'error', text: `Couldn't check this here: ${(e as Error).message}` }
  } finally {
    checking.value = false
  }
  attempts.value++
  if (result.value?.kind === 'passed') {
    done.value = true
    markDone(props.path)
  }
}

function showSolution() {
  code.value = props.solution
  result.value = null
}

function reset() {
  code.value = props.starter
  result.value = null
}
</script>

<template>
  <div class="fckt-lesson-task">
    <div class="fckt-lesson-editor fckt-glass-ring">
      <FcktEditor v-model="code" label="Your code" :min-lines="6" @run="start" />
    </div>
    <div class="fckt-playground-bar">
      <button type="button" class="fckt-run" :disabled="checking" @click="start">
        <span v-if="checking" class="fckt-spinner on-glass" aria-hidden="true"></span>
        <svg v-else aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        {{ checking ? 'Checking…' : 'Check' }}
      </button>
      <button v-if="hintsShown < hints.length" type="button" class="fckt-secondary" @click="hintsShown++">
        {{ hintsShown ? 'Another hint' : 'Hint' }}
      </button>
      <button v-if="canShowSolution" type="button" class="fckt-secondary" @click="showSolution">Show the solution</button>
      <button type="button" class="fckt-secondary" @click="reset">Start again</button>
      <span v-if="done" class="fckt-lesson-done">Done</span>
    </div>
    <ul v-if="hintsShown" class="fckt-lesson-hints">
      <li v-for="hint in hints.slice(0, hintsShown)" :key="hint">{{ hint }}</li>
    </ul>
    <div v-if="checking" class="fckt-output fckt-lesson-result" role="status">
      <span class="fckt-spinner" aria-hidden="true"></span><span class="fckt-loading">{{ isWarm() ? 'Checking…' : 'Loading the compiler…' }}</span>
    </div>
    <div v-else-if="result" class="fckt-output fckt-lesson-result" :class="result.kind" role="status">
      <span class="fckt-output-label">{{ result.kind === 'passed' ? 'check' : result.kind === 'failed' ? 'not yet' : 'error' }}</span>
      <p v-if="result.kind === 'passed'" class="fckt-lesson-passed">That's it. On to the next one.</p>
      <pre v-else>{{ result.text }}</pre>
    </div>
  </div>
</template>
