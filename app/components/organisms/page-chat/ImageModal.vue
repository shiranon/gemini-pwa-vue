<template>
  <Teleport to="body">
    <Transition
      name="image-modal"
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur"
        tabindex="-1"
        @click="handleOverlayClick"
        @keydown.esc="handleEscapeKey"
      >
        <Transition
          name="image-content"
          enter-active-class="transition-all duration-300"
          enter-from-class="opacity-0 scale-90"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition-all duration-200"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-90"
        >
          <div
            v-if="show"
            ref="modalRef"
            class="bg-card text-card-foreground m-4 flex max-h-full flex-col overflow-hidden rounded-lg shadow-2xl shadow-black/25"
            role="dialog"
            aria-modal="true"
            :aria-label="imageAlt || 'Image preview'"
            @click.stop
          >
            <ImageModalHeader
              :title="imageAlt || 'Image Preview'"
              :zoom-level="zoomLevel"
              :min-zoom="minZoom"
              :max-zoom="maxZoom"
              @zoom-in="zoomIn"
              @zoom-out="zoomOut"
              @close="handleClose"
            />

            <ImageModalContent
              ref="imageContentRef"
              :image-url="imageUrl"
              :image-alt="imageAlt"
              :image-styles="imageStyles"
              :is-loading="isLoading"
              :has-error="hasError"
              @wheel="handleWheel"
              @mouse-down="handleMouseDown"
              @mouse-move="handleMouseMove"
              @mouse-up="handleMouseUp"
              @touch-start="handleTouchStart"
              @touch-move="handleTouchMove"
              @touch-end="handleTouchEnd"
              @image-load="handleImageLoad"
              @image-error="handleImageError"
            />

            <ImageModalFooter
              :image-info="imageInfo"
              :downloadable="downloadable"
              @reset="resetView"
              @download="downloadImage"
            />
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import ImageModalHeader from '~/components/molecules/page-chat/ImageModalHeader.vue'
import ImageModalContent from '~/components/molecules/page-chat/ImageModalContent.vue'
import ImageModalFooter from '~/components/molecules/page-chat/ImageModalFooter.vue'
import { getTouchDistance } from '~/lib/touch'

export interface ImageInfo {
  width: number
  height: number
  size?: number
}

export interface ImageModalProps {
  show?: boolean
  imageUrl?: string
  imageAlt?: string
  downloadable?: boolean
  initialZoom?: number
  minZoom?: number
  maxZoom?: number
}

const props = withDefaults(defineProps<ImageModalProps>(), {
  show: false,
  imageUrl: undefined,
  imageAlt: undefined,
  downloadable: true,
  initialZoom: 1,
  minZoom: 0.1,
  maxZoom: 5,
})

const emit = defineEmits<{
  'update:show': [show: boolean]
  close: []
  download: [url: string]
}>()

const modalRef: Ref<HTMLElement | null> = ref(null)
const imageContentRef: Ref<InstanceType<typeof ImageModalContent> | null> = ref(null)

const isLoading = ref(false)
const hasError = ref(false)
const imageInfo = ref<ImageInfo | null>(null)

const zoomLevel = ref(props.initialZoom)
const panX = ref(0)
const panY = ref(0)

const isDragging = ref(false)
const lastPointerX = ref(0)
const lastPointerY = ref(0)

const touches = ref<Touch[]>([])
const initialDistance = ref(0)
const initialTouchZoom = ref(1)

const imageStyles = computed(() => ({
  transform: `scale(${zoomLevel.value}) translate(${panX.value}px, ${panY.value}px)`,
  transformOrigin: 'center center',
  transition: isDragging.value ? 'none' : 'transform 0.3s ease-out',
}))

const zoomIn = () => {
  if (zoomLevel.value < props.maxZoom) {
    zoomLevel.value = Math.min(zoomLevel.value * 1.2, props.maxZoom)
  }
}

const zoomOut = () => {
  if (zoomLevel.value > props.minZoom) {
    zoomLevel.value = Math.max(zoomLevel.value / 1.2, props.minZoom)
  }
}

const resetView = () => {
  zoomLevel.value = props.initialZoom
  panX.value = 0
  panY.value = 0
}

const handleMouseDown = (event: MouseEvent) => {
  if (event.button !== 0) return

  isDragging.value = true
  lastPointerX.value = event.clientX
  lastPointerY.value = event.clientY

  const imageContainer = imageContentRef.value?.imageContainerRef
  if (imageContainer) {
    imageContainer.style.cursor = 'grabbing'
  }
}

const handleMouseMove = (event: MouseEvent) => {
  if (!isDragging.value) return

  const deltaX = event.clientX - lastPointerX.value
  const deltaY = event.clientY - lastPointerY.value

  panX.value += deltaX / zoomLevel.value
  panY.value += deltaY / zoomLevel.value

  lastPointerX.value = event.clientX
  lastPointerY.value = event.clientY
}

const handleMouseUp = () => {
  isDragging.value = false

  const imageContainer = imageContentRef.value?.imageContainerRef
  if (imageContainer) {
    imageContainer.style.cursor = 'grab'
  }
}

const handleWheel = (event: WheelEvent) => {
  const zoomDelta = event.deltaY > 0 ? 0.9 : 1.1
  const newZoom = Math.max(props.minZoom, Math.min(props.maxZoom, zoomLevel.value * zoomDelta))

  if (newZoom !== zoomLevel.value) {
    zoomLevel.value = newZoom
  }
}

const handleTouchStart = (event: TouchEvent) => {
  touches.value = Array.from(event.touches)

  if (touches.value.length === 1 && touches.value[0]) {
    isDragging.value = true
    lastPointerX.value = touches.value[0].clientX
    lastPointerY.value = touches.value[0].clientY
  } else if (touches.value.length === 2 && touches.value[0] && touches.value[1]) {
    isDragging.value = false
    initialDistance.value = getTouchDistance(touches.value[0], touches.value[1])
    initialTouchZoom.value = zoomLevel.value
  }
}

const handleTouchMove = (event: TouchEvent) => {
  event.preventDefault()
  touches.value = Array.from(event.touches)

  if (touches.value.length === 1 && touches.value[0] && isDragging.value) {
    const deltaX = touches.value[0].clientX - lastPointerX.value
    const deltaY = touches.value[0].clientY - lastPointerY.value

    panX.value += deltaX / zoomLevel.value
    panY.value += deltaY / zoomLevel.value

    lastPointerX.value = touches.value[0].clientX
    lastPointerY.value = touches.value[0].clientY
  } else if (touches.value.length === 2 && touches.value[0] && touches.value[1]) {
    const currentDistance = getTouchDistance(touches.value[0], touches.value[1])
    const zoomRatio = currentDistance / initialDistance.value
    const newZoom = Math.max(props.minZoom, Math.min(props.maxZoom, initialTouchZoom.value * zoomRatio))

    zoomLevel.value = newZoom
  }
}

const handleTouchEnd = () => {
  isDragging.value = false
  touches.value = []
}

const handleImageLoad = () => {
  isLoading.value = false
  hasError.value = false

  const imageRef = imageContentRef.value?.imageRef
  if (imageRef) {
    imageInfo.value = {
      width: imageRef.naturalWidth,
      height: imageRef.naturalHeight,
    }
  }
}

const handleImageError = () => {
  isLoading.value = false
  hasError.value = true
  imageInfo.value = null
}

const downloadImage = () => {
  if (props.imageUrl) {
    const link = document.createElement('a')
    link.href = props.imageUrl
    link.download = props.imageAlt || 'image'
    link.click()

    emit('download', props.imageUrl)
  }
}

const handleClose = () => {
  emit('update:show', false)
  emit('close')
}

const handleOverlayClick = () => {
  handleClose()
}

const handleEscapeKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    handleClose()
  }
}

watch(
  () => props.show,
  (newShow) => {
    if (newShow) {
      resetView()
      isLoading.value = true
      hasError.value = false
      imageInfo.value = null

      document.body.style.overflow = 'hidden'

      nextTick(() => {
        modalRef.value?.focus()
      })
    } else {
      document.body.style.overflow = ''
    }
  }
)

watch(
  () => props.imageUrl,
  () => {
    if (props.imageUrl) {
      isLoading.value = true
      hasError.value = false
    }
  }
)

onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>

<style scoped>
/* Reduced motion 対応 - CSS @keyframesでしか実現できない部分のみ */
@media (prefers-reduced-motion: reduce) {
  .will-change-transform {
    transition: none !important;
  }
}
</style>
