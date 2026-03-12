import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/styles.css'
import { bootstrapSession } from './stores/session'

bootstrapSession()
createApp(App).use(router).mount('#app')
