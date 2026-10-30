<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { highlighted } from './highlight'

// Editable fckt: a transparent textarea over the same code highlighted, so typing works as it does
// in any text box. Tab indents, and Ctrl or ⌘ with Enter asks to run.
const props = defineProps<{ label?: string; minLines?: number }>()
const code = defineModel<string>({ required: true })
const emit = defineEmits<{ run: [] }>()
const html = ref('')
const textarea = ref<HTMLTextAreaElement>()

let latest = 0
async function paint() {
  const asked = ++latest
  const result = await highlighted(code.value)
  if (asked === latest) html.value = result
}
watch(code, paint)
onMounted(paint)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    emit('run')
  } else if (event.key === 'Tab' && !event.shiftKey) {
    event.preventDefault()
    const el = textarea.value!
    const { selectionStart: start, selectionEnd: end } = el
    code.value = code.value.slice(0, start) + '  ' + code.value.slice(end)
    requestAnimationFrame(() => el.setSelectionRange(start + 2, start + 2))
  }
}

defineExpose({ focus: () => textarea.value?.focus() })
</script>

<template>
  <div class="fckt-editor" :style="{ '--min-lines': props.minLines ?? 3 }">
    <!-- The trailing newline keeps the highlighted copy as tall as the textarea when it ends in one. -->
    <pre aria-hidden="true"><code v-html="html + '\n'"></code></pre>
    <textarea
      ref="textarea"
      v-model="code"
      :aria-label="props.label ?? 'fckt code'"
      spellcheck="false"
      wrap="off"
      autocapitalize="off"
      autocomplete="off"
      @keydown="onKeydown"
    ></textarea>
  </div>
</template>

<style scoped>
.fckt-editor {
  position: relative;
  display: grid;
  /* Long lines scroll the whole editor, so the highlighted copy and the textarea move together. */
  grid-template-columns: minmax(100%, max-content);
  overflow-x: auto;
  font-family: var(--vp-font-family-mono);
  font-size: var(--vp-code-font-size);
  line-height: var(--vp-code-line-height);
}
.fckt-editor > pre,
.fckt-editor > textarea {
  grid-area: 1 / 1;
  margin: 0;
  padding: 20px 24px;
  border: 0;
  font: inherit;
  white-space: pre;
  overflow: hidden;
  tab-size: 2;
  min-height: calc(var(--min-lines) * var(--vp-code-line-height) * 1em + 40px);
}
.fckt-editor > pre code {
  font: inherit;
  color: var(--vp-code-block-color);
}
.fckt-editor > pre :deep(span) {
  color: var(--shiki-light);
}
.dark .fckt-editor > pre :deep(span) {
  color: var(--shiki-dark);
}
.fckt-editor > textarea {
  resize: none;
  background: transparent;
  color: transparent;
  caret-color: var(--vp-c-text-1);
  outline: none;
}
.fckt-editor:focus-within {
  box-shadow: inset 0 0 0 1px var(--vp-c-brand-1);
}
.fckt-editor > textarea::selection {
  background: var(--vp-c-brand-soft);
}
</style>
