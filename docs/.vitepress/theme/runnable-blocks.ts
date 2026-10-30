import { createApp } from 'vue'
import RunnableBlock from './RunnableBlock.vue'

// Gives each example the build marked as runnable its Run and Edit controls. Called after every
// page loads; blocks that already have them are left alone.
export function enhanceRunnableBlocks() {
  document.querySelectorAll<HTMLElement>('.fckt-runnable:not([data-ready])').forEach(wrapper => {
    wrapper.dataset.ready = ''
    const original = wrapper.querySelector('pre code')?.textContent?.replace(/\n$/, '') ?? ''
    const context = JSON.parse(wrapper.dataset.context ?? '[]')
    const mount = document.createElement('div')
    wrapper.append(mount)
    createApp(RunnableBlock, { wrapper, original, context }).mount(mount)
  })
}
