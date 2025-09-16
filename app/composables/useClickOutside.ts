/**
 * クリック外側検知用ディレクティブ
 */

interface HTMLElementWithClickOutside extends HTMLElement {
  clickOutsideEvent?: (event: Event) => void
}

/**
 * 要素外のクリックを検知するディレクティブ
 */
export const vClickOutside = {
  mounted(el: HTMLElementWithClickOutside, binding: { value: () => void }) {
    el.clickOutsideEvent = (event: Event) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value()
      }
    }
    document.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted(el: HTMLElementWithClickOutside) {
    if (el.clickOutsideEvent) {
      document.removeEventListener('click', el.clickOutsideEvent)
    }
  },
}
