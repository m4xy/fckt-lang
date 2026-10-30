import DefaultTheme from 'vitepress/theme'
import { useRoute } from 'vitepress'
import { nextTick, onMounted, watch } from 'vue'
import type { Theme } from 'vitepress'
import FcktPlayground from './FcktPlayground.vue'
import { enhanceRunnableBlocks } from './runnable-blocks'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('FcktPlayground', FcktPlayground)
  },
  setup() {
    const route = useRoute()
    const enhance = () => nextTick(enhanceRunnableBlocks)
    onMounted(enhance)
    watch(() => route.path, enhance)
  },
} satisfies Theme
