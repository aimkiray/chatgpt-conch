/* eslint-disable react/jsx-key */
import { Show, createEffect, createSignal, onMount } from 'solid-js'

interface MenuProps {
  selectedModel: string
  onModelChange: (model: string) => void
  showTokenCount: boolean
  onToggleTokenCount: (show: boolean) => void
  member: boolean
  onToggleMember: (show: boolean) => void
}

const GPT_MODELS = [
  { value: 'gpt-3.5-turbo-0301', label: 'GPT-3.5' },
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-4-32k', label: 'GPT-4-32K' },
]

export default (props: MenuProps) => {
  const [selectedModel, setSelectedModel] = createSignal(props.selectedModel)
  const [showTokenCount, setShowTokenCount] = createSignal(props.showTokenCount)
  const [member, setMember] = createSignal(props.member)
  const [showDropdown, setShowDropdown] = createSignal(false)
  const [pageLoading, setPageLoading] = createSignal(true)

  onMount(() => {
    try {
      if (localStorage.getItem('selectedModel')) {
        setSelectedModel(localStorage.getItem('selectedModel'))
        props.onModelChange(localStorage.getItem('selectedModel'))
      }

      if (localStorage.getItem('showTokenCount')) {
        setShowTokenCount(localStorage.getItem('showTokenCount') === 'true')
        props.onToggleTokenCount(localStorage.getItem('showTokenCount') === 'true')
      }

      if (localStorage.getItem('member')) {
        setMember(localStorage.getItem('member') === 'true')
        props.onToggleMember(localStorage.getItem('member') === 'true')
      }
    } catch (err) {
      console.error(err)
    }
    setPageLoading(false)
  })

  const handleModelButtonClick = (model: string) => {
    setSelectedModel(model)
    props.onModelChange(model)
    localStorage.setItem('selectedModel', model)
  }

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown())
  }

  const handleClickOutside = (e: MouseEvent) => {
    if (!e.composedPath().includes(document.getElementById('toggleDropdown')))
      setShowDropdown(false)
  }

  createEffect(() => {
    if (showDropdown())
      window.addEventListener('click', handleClickOutside)
    else
      window.removeEventListener('click', handleClickOutside)
  })

  const handleToggleTokenCount = (e: Event) => {
    const target = e.target as HTMLInputElement
    setShowTokenCount(target.checked)
    props.onToggleTokenCount(target.checked)
    localStorage.setItem('showTokenCount', target.checked ? 'true' : 'false')
  }

  const handleToggleMember = (e: Event) => {
    const target = e.target as HTMLInputElement
    setMember(target.checked)
    props.onToggleMember(target.checked)
    localStorage.setItem('member', target.checked ? 'true' : 'false')
  }

  return (
    <>
      <style>
        {`
          .menu-container {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }
        `}
      </style>
      <div class="menu-container text-sm font-semibold" class:op-50={pageLoading()}>
        <div class="menu-item">
          <div class="inline-flex items-center">
            <span class="leading-5 mr-2">选择模型</span>
            <div class="relative">
              <button id="toggleDropdown" class="flex items-center rounded-full leading-5 text-xs bg-slate-400/10 py-1 px-3 space-x-2 hover:bg-slate-400/20 dark:highlight-white/5" onClick={toggleDropdown} disabled={pageLoading()}>
                {GPT_MODELS.find(model => model.value === selectedModel()).label}
                <svg width="6" height="3" class="ml-2 overflow-visible" aria-hidden="true"><path d="M0 0L3 3L6 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>
              </button>
              <Show when={showDropdown()}>
                <div class="absolute top-full mt-1 py-2 w-40 bg-white border border-solid text-xs leading-6 font-semibold text-slate-700 dark:bg-slate-600 dark:text-slate-300 dark:highlight-white/5">
                  {GPT_MODELS.map(model => (
                    <a class="block px-3 py-1 cursor-pointer hover:bg-slate-400/10" onClick={() => handleModelButtonClick(model.value)}>{model.label}</a>
                  ))}
                </div>
              </Show>
            </div>
          </div>
        </div>

        <div class="menu-item">
          <label class="inline-flex items-center">
            <input
              onChange={handleToggleMember}
              checked={member()}
              disabled={pageLoading()}
              type="checkbox"
              class="rounded bg-gray-200 border-transparent focus:border-transparent focus:bg-gray-200 text-gray-700 focus:ring-1 focus:ring-offset-2 focus:ring-gray-500"
            />
            <span class="ml-2">参加俱乐部</span>
          </label>
        </div>

        <div class="menu-item">
          <label class="inline-flex items-center">
            <input
              onChange={handleToggleTokenCount}
              checked={showTokenCount()}
              disabled={pageLoading()}
              type="checkbox"
              class="rounded bg-gray-200 border-transparent focus:border-transparent focus:bg-gray-200 text-gray-700 focus:ring-1 focus:ring-offset-2 focus:ring-gray-500"
            />
            <span class="ml-2">计数器</span>
          </label>
        </div>

      </div>
    </>
  )
}
