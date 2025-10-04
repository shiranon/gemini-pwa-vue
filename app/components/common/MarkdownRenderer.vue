<template>
  <div class="markdown-body">
    <RenderBlock
      v-for="(block, index) in nodes"
      :key="index"
      :node="block"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, resolveComponent } from 'vue'
import type { PropType, VNode, VNodeChild } from 'vue'
import MarkdownImage from '~/components/common/MarkdownImage.vue'
import CharacterImageRenderer from '~/components/common/CharacterImageRenderer.vue'
import { parseMarkdown, type MarkdownBlockNode, type MarkdownInlineNode, type MarkdownListItemNode } from '~/lib/markdown'

const props = defineProps({
  content: {
    type: String,
    default: '',
  },
})

const nodes = computed(() => parseMarkdown(props.content))

const renderInlineNodes = (inlineNodes: MarkdownInlineNode[]): VNodeChild[] => {
  return inlineNodes.map((node, index) => {
    switch (node.type) {
      case 'text':
        return node.value
      case 'break':
        return h('br', { key: index })
      case 'inlineCode':
        return h('code', { key: index }, node.value)
      case 'strong':
        return h('strong', { key: index }, renderInlineNodes(node.children))
      case 'emphasis':
        return h('em', { key: index }, renderInlineNodes(node.children))
      case 'delete':
        return h('del', { key: index }, renderInlineNodes(node.children))
      case 'link':
        return h(
          'a',
          {
            key: index,
            href: node.href,
            title: node.title ?? undefined,
            target: '_blank',
            rel: 'noopener noreferrer',
          },
          renderInlineNodes(node.children)
        )
      case 'image':
        return h('img', {
          key: index,
          class: 'markdown-inline-image',
          src: node.src,
          alt: node.alt ?? '',
          title: node.title ?? undefined,
          loading: 'lazy',
          decoding: 'async',
        })
      case 'characterImage':
        return h(CharacterImageRenderer, {
          key: index,
          characterName: node.characterName,
          outfitName: node.outfitName,
          expression: node.expression,
          alt: node.alt,
          title: node.title,
        })
      default:
        return null
    }
  })
}

const renderListItems = (items: MarkdownListItemNode[]): VNodeChild[] => {
  return items.map((item, index) =>
    h(
      'li',
      { key: index },
      item.children.map((child, childIndex) => renderBlockNode(child, `${index}-${childIndex}`))
    )
  )
}

const renderBlockNode = (node: MarkdownBlockNode, key?: string | number): VNode => {
  const prismComponent = resolveComponent('Prism')

  switch (node.type) {
    case 'paragraph':
      return h('p', { key }, renderInlineNodes(node.children))
    case 'heading': {
      const tag = `h${Math.min(6, Math.max(1, node.depth))}`
      return h(tag, { key }, renderInlineNodes(node.children))
    }
    case 'code': {
      const language = node.language && node.language.length > 0 ? node.language : 'plaintext'
      return h(
        prismComponent,
        {
          key,
          class: 'prism-code',
          language,
        },
        {
          default: () => node.value,
        }
      )
    }
    case 'blockquote':
      return h(
        'blockquote',
        { key },
        node.children.map((child, index) => renderBlockNode(child, index))
      )
    case 'list': {
      const tag = node.ordered ? 'ol' : 'ul'
      const className = node.loose ? 'markdown-list markdown-list--loose' : 'markdown-list'
      return h(tag, { key, class: className }, renderListItems(node.items))
    }
    case 'figure':
      return h(MarkdownImage, {
        key,
        src: node.src,
        alt: node.alt ?? '',
        caption: node.title ?? null,
        title: node.title ?? null,
      })
    case 'thematicBreak':
      return h('hr', { key, class: 'markdown-hr' })
    default:
      return h('div', { key })
  }
}

const RenderBlock = defineComponent({
  name: 'RenderBlock',
  props: {
    node: {
      type: Object as PropType<MarkdownBlockNode>,
      required: true,
    },
  },
  setup(componentProps) {
    return () => renderBlockNode(componentProps.node)
  },
})
</script>

<style scoped>
.markdown-inline-image {
  display: inline-block;
  width: var(--message-image-width, 100%);
  max-width: 100%;
  height: auto;
  vertical-align: middle;
  border-radius: 0.375rem;
}

.markdown-list {
  list-style-type: disc;
}

.markdown-list--loose {
  gap: 0.5rem;
}

.markdown-hr {
  border-color: var(--border);
}
</style>
