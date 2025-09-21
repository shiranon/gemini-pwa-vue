declare module 'vue-prism-component' {
  import type { DefineComponent } from 'vue'

  export interface PrismComponentProps {
    /**
     * The programming language for syntax highlighting
     * @example 'javascript', 'typescript', 'css', 'html', etc.
     */
    language?: string

    /**
     * The code content to highlight
     * Alternative to using slot content
     */
    code?: string

    /**
     * Render as inline code instead of block-level
     * @default false
     */
    inline?: boolean
  }

  export interface PrismComponentSlots {
    /**
     * Default slot for code content
     * Used when code prop is not provided
     */
    default(): unknown
  }

  const component: DefineComponent<PrismComponentProps, object, object, object, object, object, object, object, string, object, object, string, PrismComponentSlots>
  export default component
}
