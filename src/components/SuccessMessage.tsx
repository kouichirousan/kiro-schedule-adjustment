'use client'

interface SuccessMessageProps {
  title: string
  message: string
  onClose?: () => void
  autoClose?: boolean
  duration?: number
}

export default function SuccessMessage({ 
  title, 
  message, 
  onClose, 
  autoClose = false, 
  duration = 3000 
}: SuccessMessageProps) {
  // 自動クローズ機能
  if (autoClose && onClose) {
    setTimeout(() => {
      onClose()
    }, duration)
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg">
        <div className="flex items-start">
          <div className="text-green-400 mr-3 mt-0.5">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-green-800 text-sm font-medium">{title}</h3>
            <p className="text-green-700 text-sm mt-1">{message}</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-green-400 hover:text-green-600 ml-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}