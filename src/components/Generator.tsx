import { Index, Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js'
import { useThrottleFn } from 'solidjs-use'
import { encode } from '@/utils/tokenizer/encoder'
import { generateSignature } from '@/utils/auth'
import IconClear from './icons/Clear'
import IconSend from './icons/Send'
import IconDown from './icons/Down'
import MessageItem from './MessageItem'
import SystemRoleSettings from './SystemRoleSettings'
import ErrorMessageItem from './ErrorMessageItem'
import Menu from './Menu'
import { chatBot } from './MagicConch'
import type { ChatMessage, ErrorMessage } from '@/types'

interface EnvProps {
  model: string
  member: string
  tokenCount: string
}

export default (props: EnvProps) => {
  let inputRef: HTMLTextAreaElement
  const [currentSystemRoleSettings, setCurrentSystemRoleSettings] = createSignal('')
  const [systemRoleEditing, setSystemRoleEditing] = createSignal(false)
  const [messageList, setMessageList] = createSignal<ChatMessage[]>([])
  const [currentError, setCurrentError] = createSignal<ErrorMessage>()
  const [currentAssistantMessage, setCurrentAssistantMessage] = createSignal('')
  const [loading, setLoading] = createSignal(false)
  const [pageLoading, setPageLoading] = createSignal(true)
  const [controller, setController] = createSignal<AbortController>(null)
  const [isStick, setStick] = createSignal(false)
  //   const tokenizer = new GPT3Tokenizer({ type: 'gpt3' }) // or 'codex'
  const [tokenCount, setTokenCount] = createSignal(0)
  const [selectedModel, setSelectedModel] = createSignal(props.model)
  const [showTokenCount, setShowTokenCount] = createSignal(props.tokenCount === 'yes')
  const [member, setMember] = createSignal(props.member === 'yes')
  const maxToken = {
    'gpt-3.5-turbo-0301': '4096',
    'gpt-4': '8192',
    'gpt-4-32k': '32768',
  }
  const modelPrice = {
    'gpt-3.5-turbo-0301': 0.002,
    'gpt-4': 0.06,
    'gpt-4-32k': 0.12,
  }

  createEffect(() => (isStick() && smoothToBottom()))

  onMount(() => {
    setPageLoading(false)
    let lastPostion = window.scrollY

    window.addEventListener('scroll', () => {
      const nowPostion = window.scrollY
      nowPostion < lastPostion && setStick(false)
      lastPostion = nowPostion
    })

    try {
      if (localStorage.getItem('messageList'))
        setMessageList(JSON.parse(localStorage.getItem('messageList')))

      if (localStorage.getItem('systemRoleSettings'))
        setCurrentSystemRoleSettings(localStorage.getItem('systemRoleSettings'))

      if (localStorage.getItem('stickToBottom') === 'stick')
        setStick(true)
    } catch (err) {
      console.error(err)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    onCleanup(() => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    })
    getMessageToken()
  })

  const handleBeforeUnload = () => {
    localStorage.setItem('messageList', JSON.stringify(messageList()))
    localStorage.setItem('systemRoleSettings', currentSystemRoleSettings())
    isStick() ? localStorage.setItem('stickToBottom', 'stick') : localStorage.removeItem('stickToBottom')
  }

  const handleButtonClick = async() => {
    const inputValue = inputRef.value
    if (!inputValue)
      return

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    if (window?.umami) umami.trackEvent('chat_generate')
    inputRef.value = ''
    setMessageList([
      ...messageList(),
      {
        role: 'user',
        content: inputValue,
      },
    ])
    if (!member()) {
      requestWithNoFee(inputValue)
      return
    }
    requestWithLatestMessage()
    instantToBottom()
  }

  const smoothToBottom = useThrottleFn(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }, 300, false, true)

  const instantToBottom = () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'auto' })
  }

  const requestWithLatestMessage = async() => {
    setLoading(true)
    setCurrentAssistantMessage('')
    setCurrentError(null)
    const storagePassword = localStorage.getItem('pass')
    try {
      const controller = new AbortController()
      setController(controller)
      const requestMessageList = [...messageList()]
      if (currentSystemRoleSettings()) {
        requestMessageList.unshift({
          role: 'system',
          content: currentSystemRoleSettings(),
        })
      }
      const timestamp = Date.now()
      const response = await fetch('/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          messages: requestMessageList,
          model: selectedModel(),
          time: timestamp,
          pass: storagePassword,
          sign: await generateSignature({
            t: timestamp,
            m: requestMessageList?.[requestMessageList.length - 1]?.content || '',
          }),
        }),
        signal: controller.signal,
      })
      if (!response.ok) {
        const error = await response.json()
        console.error(error.error)
        setCurrentError(error.error)
        throw new Error('Request failed')
      }
      const data = response.body
      if (!data)
        throw new Error('No data')

      const reader = data.getReader()
      const decoder = new TextDecoder('utf-8')
      let done = false

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        if (value) {
          const char = decoder.decode(value)
          if (char === '\n' && currentAssistantMessage().endsWith('\n'))
            continue

          if (char)
            setCurrentAssistantMessage(currentAssistantMessage() + char)

          isStick() && instantToBottom()
        }
        done = readerDone
      }
    } catch (e) {
      console.error(e)
      setLoading(false)
      setController(null)
      return
    }
    archiveCurrentMessage()
    isStick() && instantToBottom()
  }

  const archiveCurrentMessage = () => {
    if (currentAssistantMessage()) {
      setMessageList([
        ...messageList(),
        {
          role: 'assistant',
          content: currentAssistantMessage(),
        },
      ])
      setCurrentAssistantMessage('')
      setLoading(false)
      setController(null)
      getMessageToken()
      inputRef.focus()
    }
  }

  const clear = () => {
    inputRef.value = ''
    inputRef.style.height = 'auto'
    setMessageList([])
    setCurrentAssistantMessage('')
    setCurrentError(null)
    setTokenCount(0)
  }

  const stopStreamFetch = () => {
    if (controller()) {
      controller().abort()
      archiveCurrentMessage()
    }
  }

  const retryLastFetch = () => {
    if (messageList().length > 0) {
      const lastMessage = messageList()[messageList().length - 1]
      if (lastMessage.role === 'assistant')
        setMessageList(messageList().slice(0, -1))

      requestWithLatestMessage()
    }
  }

  const getMessageToken = () => {
    const requestMessageList = [...messageList()]
    if (currentSystemRoleSettings()) {
      requestMessageList.unshift({
        role: 'system',
        content: currentSystemRoleSettings(),
      })
    }
    let messageStr = ''
    requestMessageList.forEach((element) => {
      messageStr += `${element.content} `
    })
    messageStr += ` ${inputRef.value}`
    // const encoded: { bpe: number[], text: string[] } = tokenizer.encode(messageStr.trim())
    // setTokenCount(encoded.bpe.length)
    setTokenCount(encode(messageStr.trim()).length)
  }

  const requestWithNoFee = (input: string) => {
    setLoading(true)
    setCurrentAssistantMessage('')
    setCurrentError(null)
    const response = chatBot(input)
    if (response)
      setCurrentAssistantMessage(currentAssistantMessage() + response)

    archiveCurrentMessage()
    isStick() && instantToBottom()
  }

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.isComposing || e.shiftKey)
      return

    if (e.keyCode === 13) {
      e.preventDefault()
      handleButtonClick()
    }
  }

  return (
    <div my-6>
      <Menu
        selectedModel={selectedModel()}
        onModelChange={setSelectedModel}
        showTokenCount={showTokenCount()}
        onToggleTokenCount={setShowTokenCount}
        member={member()}
        onToggleMember={setMember}
      />
      <SystemRoleSettings
        canEdit={() => messageList().length === 0}
        systemRoleEditing={systemRoleEditing}
        setSystemRoleEditing={setSystemRoleEditing}
        currentSystemRoleSettings={currentSystemRoleSettings}
        setCurrentSystemRoleSettings={setCurrentSystemRoleSettings}
      />
      <Index each={messageList()}>
        {(message, index) => (
          <MessageItem
            role={message().role}
            message={message().content}
            showRetry={() => (message().role === 'assistant' && index === messageList().length - 1)}
            onRetry={retryLastFetch}
          />
        )}
      </Index>
      {currentAssistantMessage() && (
        <MessageItem
          role="assistant"
          message={currentAssistantMessage}
        />
      )}
      { currentError() && <ErrorMessageItem data={currentError()} onRetry={retryLastFetch} /> }
      <Show
        when={!loading()}
        fallback={() => (
          <div class="gen-cb-wrapper">
            <span>思考中...</span>
            <div class="gen-cb-stop" onClick={stopStreamFetch}>打断</div>
          </div>
        )}
      >
        <div class="gen-text-wrapper" class:op-50={pageLoading() || systemRoleEditing()}>
          <textarea
            ref={inputRef!}
            disabled={pageLoading() || systemRoleEditing()}
            onKeyDown={handleKeydown}
            placeholder="Enter something..."
            autocomplete="off"
            autofocus
            onInput={() => {
              inputRef.style.height = 'auto'
              inputRef.style.height = `${inputRef.scrollHeight}px`
              getMessageToken()
            }}
            rows="1"
            class="gen-textarea"
          />
          <button onClick={handleButtonClick} disabled={pageLoading() || systemRoleEditing()} gen-slate-btn>
            <IconSend />
          </button>
          <button title="Clear" onClick={clear} disabled={pageLoading() || systemRoleEditing()} gen-slate-btn>
            <IconClear />
          </button>
        </div>
        <Show when={showTokenCount()}>
          <Show when={member()}>
            <div class="text-xs op-30">
              预估消耗 ${((modelPrice[selectedModel()] / 1000) * tokenCount()).toFixed(6)} / {tokenCount()} tokens
              <div class="mt-1" />
              Max {maxToken[selectedModel()]} tokens, Price ${modelPrice[selectedModel()]} / 1K tokens
            </div>
          </Show>
          <Show when={!member()}>
            <div class="text-xs op-30">
              预估消耗 $0 / {tokenCount()} tokens
              <div class="mt-1" />
              Max ∞ tokens, Price $0 / 1K tokens
            </div>
          </Show>
        </Show>
      </Show>
      <div class="fixed bottom-8 right-4 md:right-8 rounded-md w-fit h-fit transition-colors active:scale-90">
        <button class="text-base" title="stick to bottom" type="button" onClick={() => setStick(!isStick())}>
          <IconDown />
        </button>
      </div>
    </div>
  )
}
