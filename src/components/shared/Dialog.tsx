'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface DialogState {
  type: 'alert' | 'confirm' | 'prompt'
  title: string
  message: string
  defaultValue?: string
  resolve: (value: string | boolean | null) => void
}

export function useDialog() {
  const [dialog, setDialog] = useState<DialogState | null>(null)

  const alert = useCallback((title: string, message: string): Promise<void> => {
    return new Promise(resolve => {
      setDialog({
        type: 'alert',
        title,
        message,
        resolve: () => { setDialog(null); resolve() },
      })
    })
  }, [])

  const confirm = useCallback((title: string, message: string): Promise<boolean> => {
    return new Promise(resolve => {
      setDialog({
        type: 'confirm',
        title,
        message,
        resolve: (value) => { setDialog(null); resolve(value === true) },
      })
    })
  }, [])

  const prompt = useCallback((title: string, message: string, defaultValue = ''): Promise<string | null> => {
    return new Promise(resolve => {
      setDialog({
        type: 'prompt',
        title,
        message,
        defaultValue,
        resolve: (value) => { setDialog(null); resolve(typeof value === 'string' ? value : null) },
      })
    })
  }, [])

  return { dialog, alert, confirm, prompt }
}

export function DialogRenderer({ dialog }: { dialog: DialogState | null }) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (dialog?.type === 'prompt') {
      setInputValue(dialog.defaultValue ?? '')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [dialog])

  useEffect(() => {
    if (!dialog) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dialog.resolve(dialog.type === 'prompt' ? null : false)
      }
      if (e.key === 'Enter' && dialog.type !== 'prompt') {
        dialog.resolve(dialog.type === 'confirm' ? true : null)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [dialog])

  if (!dialog) return null

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.3)', animation: 'fadeIn 150ms ease-out' }}
      onClick={() => dialog.resolve(dialog.type === 'prompt' ? null : false)}
    >
      <div
        className="relative w-full max-w-sm mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Shine border wrapper */}
        <div
          className="p-[2px] rounded-xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #9E7AFF 0%, #FE8BBB 50%, #9E7AFF 100%)',
            backgroundSize: '200% 200%',
            animation: 'borderShine 3s linear infinite',
          }}
        >
          <div
            className="rounded-[10px] p-5"
            style={{ backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-xl)' }}
          >
            <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              {dialog.title}
            </h3>
            <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
              {dialog.message}
            </p>

            {dialog.type === 'prompt' && (
              <input
                ref={inputRef}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') dialog.resolve(inputValue.trim() || null)
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border outline-none transition-colors focus:border-[var(--accent)] mb-4"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                placeholder="Enter value..."
              />
            )}

            <div className="flex gap-2 justify-end">
              {dialog.type !== 'alert' && (
                <button
                  onClick={() => dialog.resolve(dialog.type === 'prompt' ? null : false)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors hover:bg-[var(--bg-secondary)]"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => {
                  if (dialog.type === 'confirm') dialog.resolve(true)
                  else if (dialog.type === 'prompt') dialog.resolve(inputValue.trim() || null)
                  else dialog.resolve(null)
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-lg transition-opacity hover:opacity-80"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--bg-primary)' }}
              >
                {dialog.type === 'confirm' ? 'Confirm' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
