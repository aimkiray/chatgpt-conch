import IconRefresh from './icons/Refresh'
import type { ErrorMessage } from '@/types'

interface Props {
  data: ErrorMessage
  onRetry?: () => void
}

export default ({ data, onRetry }: Props) => {
  return (
    <div class="p-2 my-4 md:p-4 border border-red/50 bg-red/10">
      {data.code && <div class="text-red mb-1">{data.code}</div>}
      <div class="text-red op-70 text-sm">{data.message}</div>
      {onRetry && (
        <div class="fie mt-2 md:mt-4">
          <div onClick={onRetry} class="gpt-retry-btn border-red/50 text-red">
            <IconRefresh />
            <span>重来</span>
          </div>
        </div>
      )}
    </div>
  )
}
