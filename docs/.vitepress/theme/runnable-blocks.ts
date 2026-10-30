import { createApp } from 'vue'
import { withBase } from 'vitepress'
import FcktLesson from './FcktLesson.vue'
import RunnableBlock from './RunnableBlock.vue'
import { tickSidebar } from './progress'

// Gives each example the build marked as runnable its Run and Edit controls, makes each lesson's
// task into an exercise, and ticks finished lessons in the sidebar. Called after every page loads;
// what's already set up is left alone.
export function enhanceRunnableBlocks() {
  document.querySelectorAll<HTMLElement>('.fckt-runnable:not([data-ready])').forEach(wrapper => {
    wrapper.dataset.ready = ''
    const original = wrapper.querySelector('pre code')?.textContent?.replace(/\n$/, '') ?? ''
    const context = JSON.parse(wrapper.dataset.context ?? '[]')
    const mount = document.createElement('div')
    wrapper.append(mount)
    createApp(RunnableBlock, { wrapper, original, context }).mount(mount)
  })
  document.querySelectorAll<HTMLElement>('.fckt-lesson:not([data-ready])').forEach(holder => {
    holder.dataset.ready = ''
    const { starter, solution, check, hints } = JSON.parse(holder.dataset.lesson ?? '{}')
    const path = location.pathname.replace(withBase('/'), '/').replace(/\.html$/, '')
    createApp(FcktLesson, { path, starter, solution, test: check, hints }).mount(holder)
  })
  tickSidebar()
}
