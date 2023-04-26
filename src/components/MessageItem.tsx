import { createSignal } from 'solid-js'
import MarkdownIt from 'markdown-it'
import mdKatex from 'markdown-it-katex'
import mdHighlight from 'markdown-it-highlightjs'
import { useClipboard, useEventListener } from 'solidjs-use'
import IconRefresh from './icons/Refresh'
import IconConch from './icons/ConchContrast'
import IconArtist from './icons/ArtistContrast'
import IconCat from './icons/FaceContrast'
import type { Accessor } from 'solid-js'
import type { ChatMessage } from '@/types'

interface Props {
  role: ChatMessage['role']
  message: Accessor<string> | string
  showRetry?: Accessor<boolean>
  onRetry?: () => void
}

export default ({ role, message, showRetry, onRetry }: Props) => {
  const roleClass = {
    system: 'border-purple-400',
    user: 'border-slate-400',
    assistant: 'border-rose-400',
  }
  const [source] = createSignal('')
  const { copy, copied } = useClipboard({ source, copiedDuring: 1000 })

  useEventListener('click', (e) => {
    const el = e.target as HTMLElement
    let code = null

    if (el.matches('div > div.copy-btn')) {
      code = decodeURIComponent(el.dataset.code!)
      copy(code)
    }
    if (el.matches('div > div.copy-btn > svg')) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
      code = decodeURIComponent(el.parentElement?.dataset.code!)
      copy(code)
    }
  })

  const htmlString = () => {
    const md = MarkdownIt({
      linkify: true,
      breaks: true,
    }).use(mdKatex).use(mdHighlight)
    const fence = md.renderer.rules.fence!
    md.renderer.rules.fence = (...args) => {
      const [tokens, idx] = args
      const token = tokens[idx]
      const rawCode = fence(...args)

      return `<div relative>
      <div data-code=${encodeURIComponent(token.content)} class="copy-btn gpt-copy-btn group">
          <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 32 32"><path fill="currentColor" d="M28 10v18H10V10h18m0-2H10a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2Z" /><path fill="currentColor" d="M4 18H2V4a2 2 0 0 1 2-2h14v2H4Z" /></svg>
            <div class="group-hover:op-100 gpt-copy-tips">
              ${copied() ? 'Copied' : 'Copy'}
            </div>
      </div>
      ${rawCode}
      </div>`
    }

    if (typeof message === 'function')
      return md.render(message())
    else if (typeof message === 'string')
      return md.render(message)

    return ''
  }

  return (
    <div>
      {role === 'user' && (
        <div class="mt-4 mb-2"><IconCat /></div>
      )}
      {role === 'assistant' && (
        <div class="mt-4 mb-2"><IconConch /></div>
      )}
      {role === 'system' && (
        <div class="mt-4 mb-2"><IconArtist /></div>
      )}
      <div class={`p-2 md:p-4 transition-colors border border-solid md:hover:bg-slate/6 ${roleClass[role]}`}>
        <div class="flex gap-3 rounded-lg" class:op-75={role === 'user'}>
          <div class="message prose break-words overflow-hidden" innerHTML={htmlString()} />
        </div>
        {showRetry?.() && onRetry && (
        <div class="fie mt-2 md:mt-4">
          <div onClick={onRetry} class="gpt-retry-btn">
            <IconRefresh />
            <span>重来</span>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
