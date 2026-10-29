import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './app/App.vue'
import './styles.css'
import UxScreen from './ux/UxScreen.vue'
import { usePreviewStore } from './ux/mockStore'

const path = location.pathname.replace(/\/$/, '')
const pinia = createPinia()
if (path === '/ux/preview') usePreviewStore(pinia)
createApp(path === '/ux' ? UxScreen : App).use(pinia).mount('#app')
