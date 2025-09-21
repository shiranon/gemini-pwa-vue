import { defineNuxtPlugin } from '#app'
import VuePrismComponent from 'vue-prism-component'
import 'prismjs'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-typescript'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('Prism', VuePrismComponent)
})
