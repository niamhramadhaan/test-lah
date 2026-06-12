'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { FlowNode } from '@/types'
import { generateTestCases, GeneratedTestCase } from '@/lib/llm'
import { useLLMConfig } from '@/hooks/useLLMConfig'
import { extractVideoFrames } from '@/lib/video-frames'

interface GenerateTestModalProps {
  open: boolean
  onClose: () => void
  node: FlowNode
  onGenerate: (cases: GeneratedTestCase[]) => void
}

const SUGGESTIONS = [
  'User can log in with valid credentials',
  'Invalid input shows validation error',
  'Form submits successfully and redirects',
  'Edge case: empty required fields',
]

const CAT_FACTS = [
  'While you wait... have this cute cat!',
  'Hang tight! Here\'s a furry friend.',
  'Generating... enjoy this kitty!',
  'Almost there! Cat says hi.',
  'Test cases incoming... meow!',
]

const MAX_IMAGES = 5
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB per image
const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50MB per video
const MAX_VIDEO_DURATION = 120 // 2 minutes

export function GenerateTestModal({ open, onClose, node, onGenerate }: GenerateTestModalProps) {
  const { isConnected, activeProvider, activeProviderId } = useLLMConfig()
  const [title, setTitle] = useState('')
  const [prompt, setPrompt] = useState('')
  const [language, setLanguage] = useState<'en' | 'id'>('en')
  const [langOpen, setLangOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [images, setImages] = useState<string[]>([])

  const [catUrl, setCatUrl] = useState('')
  const [catFact, setCatFact] = useState(CAT_FACTS[0])
  const [catIndex, setCatIndex] = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [videoProcessing, setVideoProcessing] = useState(false)
  const [videoProgress, setVideoProgress] = useState<string | null>(null)
  const [extractedFrames, setExtractedFrames] = useState<string[]>([])
  const [selectedFrameIndices, setSelectedFrameIndices] = useState<Set<number>>(new Set())
  const [showFrameSelector, setShowFrameSelector] = useState(false)
  const [zoomedFrame, setZoomedFrame] = useState<string | null>(null)

  const refreshCat = useCallback(async () => {
    try {
      const res = await fetch('https://api.thecatapi.com/v1/images/search?size=med')
      const data = await res.json()
      if (data?.[0]?.url) {
        setCatUrl(data[0].url)
      }
    } catch {
      setCatUrl('')
    }
    setCatFact(CAT_FACTS[Math.floor(Math.random() * CAT_FACTS.length)])
  }, [])

  useEffect(() => {
    if (open) {
      setTitle(node.label)
      setPrompt('')
      setError(null)
      setLoading(false)
      setImages([])
      setExtractedFrames([])
      setSelectedFrameIndices(new Set())
      setShowFrameSelector(false)
      setCatUrl('')
      setCatIndex(0)
    }
  }, [open, node.label])

  useEffect(() => {
    if (!loading) return
    refreshCat()
    const interval = setInterval(() => {
      setCatIndex(prev => prev + 1)
      refreshCat()
    }, 2000)
    return () => clearInterval(interval)
  }, [loading, refreshCat])

  // -----------------------------------------------------------------------
  // Image helpers
  // -----------------------------------------------------------------------

  const fileToDataUri = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('Not an image file'))
        return
      }
      if (file.size > MAX_IMAGE_SIZE) {
        reject(new Error(`Image too large (max ${MAX_IMAGE_SIZE / 1024 / 1024}MB)`))
        return
      }
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })

  const processVideo = useCallback(async (file: File) => {
    if (!file.type.startsWith('video/')) {
      setError('Not a video file')
      return
    }
    if (file.size > MAX_VIDEO_SIZE) {
      setError(`Video too large (max ${MAX_VIDEO_SIZE / 1024 / 1024}MB)`)
      return
    }

    setVideoProcessing(true)
    setVideoProgress('Loading video...')

    try {
      const result = await extractVideoFrames(file)

      if (result.duration > MAX_VIDEO_DURATION) {
        setError(`Video too long (${Math.round(result.duration)}s). Max ${MAX_VIDEO_DURATION}s.`)
        setVideoProcessing(false)
        setVideoProgress(null)
        return
      }

      setVideoProgress(`Extracted ${result.frames.length} frames. Select which to include...`)

      // Show frame selector
      setExtractedFrames(result.frames)
      setSelectedFrameIndices(new Set(result.frames.map((_, i) => i))) // select all by default
      setShowFrameSelector(true)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process video')
    } finally {
      setVideoProcessing(false)
      setVideoProgress(null)
    }
  }, [])

  const confirmFrameSelection = useCallback(() => {
    const remaining = MAX_IMAGES - images.length
    const selected = extractedFrames.filter((_, i) => selectedFrameIndices.has(i))
    const toAdd = selected.slice(0, remaining)

    if (toAdd.length > 0) {
      setImages(prev => [...prev, ...toAdd])
    }

    // Reset frame selector
    setExtractedFrames([])
    setSelectedFrameIndices(new Set())
    setShowFrameSelector(false)
  }, [extractedFrames, selectedFrameIndices, images.length])

  const cancelFrameSelection = useCallback(() => {
    setExtractedFrames([])
    setSelectedFrameIndices(new Set())
    setShowFrameSelector(false)
  }, [])

  const toggleFrame = useCallback((index: number) => {
    setSelectedFrameIndices(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else if (next.size < MAX_IMAGES) {
        next.add(index)
      }
      return next
    })
  }, [])

  const selectAllFrames = useCallback(() => {
    const maxSelectable = Math.min(extractedFrames.length, MAX_IMAGES)
    setSelectedFrameIndices(new Set(Array.from({ length: maxSelectable }, (_, i) => i)))
  }, [extractedFrames])

  const deselectAllFrames = useCallback(() => {
    setSelectedFrameIndices(new Set())
  }, [])

  const addImages = useCallback(async (files: FileList | File[]) => {
    const remaining = MAX_IMAGES - images.length
    if (remaining <= 0) {
      setError(`Maximum ${MAX_IMAGES} images/frames allowed`)
      return
    }

    const fileArray = Array.from(files)
    const imageFiles = fileArray.filter(f => f.type.startsWith('image/'))
    const videoFiles = fileArray.filter(f => f.type.startsWith('video/'))

    // Process images
    const toAdd = imageFiles.slice(0, remaining)
    const dataUris: string[] = []

    for (const file of toAdd) {
      try {
        const uri = await fileToDataUri(file)
        dataUris.push(uri)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load image')
      }
    }

    if (dataUris.length > 0) {
      setImages(prev => [...prev, ...dataUris])
      setError(null)
    }

    // Process first video (if any)
    if (videoFiles.length > 0) {
      await processVideo(videoFiles[0])
    }
  }, [images.length, processVideo])

  const removeImage = useCallback((index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Clipboard paste
  useEffect(() => {
    if (!open) return

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      const imageFiles: File[] = []
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) imageFiles.push(file)
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault()
        addImages(imageFiles)
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [open, addImages])

  // Drag & drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)

    if (e.dataTransfer.files.length > 0) {
      addImages(e.dataTransfer.files)
    }
  }, [addImages])

  // Handle video file selection from dedicated button
  const handleVideoSelect = useCallback(async (file: File) => {
    await processVideo(file)
  }, [processVideo])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addImages(e.target.files)
      e.target.value = '' // reset so same file can be selected again
    }
  }, [addImages])

  // -----------------------------------------------------------------------
  // Generate
  // -----------------------------------------------------------------------

  const handleGenerate = async () => {
    if (!isConnected) {
      setError('Please configure an AI provider in Integrations first.')
      return
    }
    if (!prompt.trim() && images.length === 0) {
      setError('Please describe the feature, paste a ticket, or attach an image.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const cases = await generateTestCases(
        title,
        prompt,
        activeProvider!.apiKey,
        activeProviderId ?? undefined,
        activeProvider!.defaultModel,
        language,
        activeProvider!.baseURL || undefined,
        images.length > 0 ? images : undefined,
      )
      onGenerate(cases)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.3)', animation: 'fadeIn 150ms ease-out' }}
      onClick={onClose}
    >
      <div
        className="flex rounded-xl overflow-hidden"
        style={{
          maxWidth: loading ? '720px' : '512px',
          width: '100%',
          margin: '0 16px',
          backgroundColor: 'var(--bg-card)',
          boxShadow: 'var(--shadow-lg)',
          transition: 'max-width 400ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Main form */}
        <div className="flex-1 min-w-0" style={{ maxWidth: '512px' }}>
          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #8D6E63, #A1887F)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Generate Test Cases
              </h3>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Describe the feature and let AI generate test cases for &ldquo;{node.label}&rdquo;
            </p>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-4">
            {/* Title */}
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Test Case Title
              </label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg outline-none border transition-colors focus:border-[var(--accent)]"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}
                placeholder="Feature name..."
              />
            </div>

            {/* Prompt */}
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Description / DoD / Ticket
              </label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 text-sm rounded-lg outline-none border resize-none transition-colors focus:border-[var(--accent)]"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}
                placeholder={language === 'id' ? 'Jelaskan fitur, kriteria penerimaan, atau tempel tiket...' : 'Describe the feature, acceptance criteria, or paste a ticket...'}
              />
              {/* Suggestions */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => setPrompt(prev => prev ? `${prev}\n${s}` : s)}
                    className="px-2 py-0.5 text-[10px] rounded-full border transition-colors hover:bg-[var(--bg-secondary)]"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Image & Video attachments */}
            <div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Screenshots & Videos <span className="font-normal" style={{ color: 'var(--text-tertiary)' }}>(optional)</span>
              </label>

              {/* Image previews */}
              {images.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {images.map((img, i) => (
                    <div
                      key={i}
                      className="relative group rounded-lg overflow-hidden border"
                      style={{ borderColor: 'var(--border)', width: 72, height: 72 }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img}
                        alt={`Screenshot ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff' }}
                        title="Remove"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Drop zone / upload area */}
              <div
                ref={dropZoneRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border-2 border-dashed cursor-pointer transition-colors"
                style={{
                  borderColor: dragOver ? 'var(--accent)' : 'var(--border)',
                  backgroundColor: dragOver ? 'var(--accent)' + '08' : 'transparent',
                  padding: images.length > 0 ? '8px' : '16px',
                }}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                    {images.length > 0
                      ? `Add more (${images.length}/${MAX_IMAGES}) · paste, drop, or click`
                      : 'Paste from clipboard, drop, or click to upload'}
                  </span>
                </div>
              </div>

              {/* Video section */}
              {!showFrameSelector && images.length < MAX_IMAGES && (
                <div className="mt-2">
                  {videoProcessing ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" strokeDasharray="30 70" />
                      </svg>
                      <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                        {videoProgress}
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); videoInputRef.current?.click() }}
                      className="flex items-center gap-2 px-3 py-1.5 text-[11px] rounded-lg border transition-colors hover:bg-[var(--bg-secondary)]"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="23 7 16 12 23 17 23 7" />
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                      </svg>
                      Upload video (extract key frames)
                    </button>
                  )}
                </div>
              )}

              {/* Frame selector */}
              {showFrameSelector && extractedFrames.length > 0 && (
                <div className="mt-2 p-3 rounded-lg border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Select frames <span style={{ color: 'var(--text-tertiary)' }}>({selectedFrameIndices.size}/{MAX_IMAGES} max)</span>
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={selectAllFrames}
                        className="text-[10px] px-1.5 py-0.5 rounded hover:bg-[var(--bg-card)]"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={deselectAllFrames}
                        className="text-[10px] px-1.5 py-0.5 rounded hover:bg-[var(--bg-card)]"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        None
                      </button>
                    </div>
                  </div>

                  {/* Frame thumbnails */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {extractedFrames.map((frame, i) => (
                      <div
                        key={i}
                        className="relative group rounded-md overflow-hidden border-2 transition-all cursor-pointer"
                        style={{
                          width: 80,
                          height: 80,
                          borderColor: selectedFrameIndices.has(i) ? 'var(--accent)' : 'var(--border)',
                          opacity: selectedFrameIndices.has(i) ? 1 : 0.5,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleFrame(i)}
                          className="w-full h-full"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={frame}
                            alt={`Frame ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                        {/* Zoom button */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setZoomedFrame(frame) }}
                          className="absolute top-0.5 left-0.5 w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff' }}
                          title="Zoom"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            <line x1="11" y1="8" x2="11" y2="14" />
                            <line x1="8" y1="11" x2="14" y2="11" />
                          </svg>
                        </button>
                        {/* Selection checkmark */}
                        {selectedFrameIndices.has(i) && (
                          <div
                            className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        )}
                        <span
                          className="absolute bottom-0 left-0 right-0 text-center text-[9px] py-0.5"
                          style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}
                        >
                          {i + 1}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={cancelFrameSelection}
                      className="flex-1 px-3 py-1.5 text-[11px] rounded-md border transition-colors hover:bg-[var(--bg-card)]"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmFrameSelection}
                      disabled={selectedFrameIndices.size === 0}
                      className="flex-1 px-3 py-1.5 text-[11px] rounded-md transition-colors hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: 'var(--accent)',
                        color: '#fff',
                      }}
                    >
                      Add {selectedFrameIndices.size} frame{selectedFrameIndices.size !== 1 ? 's' : ''}
                    </button>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    await processVideo(file)
                    e.target.value = ''
                  }
                }}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--status-fail-bg)', color: 'var(--status-fail-text)' }}>
                {error}
              </div>
            )}

            {/* API Key hint */}
            {!isConnected && (
              <div className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--status-skip-bg)', color: 'var(--status-skip-text)' }}>
                No AI provider configured. Go to Integrations to set up.
              </div>
            )}

            {/* Language selector — accordion */}
            <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => setLangOpen(prev => !prev)}
                className="w-full flex items-center justify-between px-3 py-2 transition-colors hover:bg-[var(--bg-secondary)]"
              >
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Language</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
                    {language === 'en' ? 'EN' : 'ID'}
                  </span>
                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: langOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms ease-out' }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </button>
              <div style={{ maxHeight: langOpen ? '80px' : '0px', overflow: 'hidden', transition: 'max-height 200ms ease-out' }}>
                <div className="px-3 pb-2 pt-1">
                  <select
                    value={language}
                    onChange={e => { setLanguage(e.target.value as 'en' | 'id'); setLangOpen(false) }}
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border outline-none transition-colors cursor-pointer"
                    style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}
                  >
                    <option value="en">English</option>
                    <option value="id">Bahasa Indonesia</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t flex gap-2" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={onClose}
              className="flex-1 px-3 py-2.5 text-xs font-medium rounded-lg border transition-colors hover:bg-[var(--bg-secondary)]"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading || !isConnected}
              className="flex-1 px-3 py-2.5 text-xs font-medium rounded-lg transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #8D6E63, #A1887F)',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(141,110,99,0.3)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeDasharray="30 70" />
                  </svg>
                  Generating...
                </span>
              ) : 'Generate Test Cases'}
            </button>
          </div>
        </div>

        {/* Cat loading panel — slides in from the right */}
        <div
          className="flex-shrink-0 overflow-hidden"
          style={{
            width: loading ? '280px' : '0px',
            transition: 'width 400ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div
            className="w-[280px] h-full flex flex-col items-center justify-center p-5 border-l"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--bg-secondary)',
              opacity: loading ? 1 : 0,
              transition: 'opacity 300ms ease-out 100ms',
            }}
          >
            {/* Cat image */}
            <div
              className="w-full rounded-xl overflow-hidden mb-4 border"
              style={{
                borderColor: 'var(--border)',
                height: 180,
                backgroundColor: 'var(--bg-card)',
              }}
            >
              {catUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={catIndex}
                  src={catUrl}
                  alt="Cute cat"
                  width={280}
                  height={180}
                  className="w-full h-full object-cover"
                  style={{ animation: 'fadeIn 800ms ease-out' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              )}
            </div>

            {/* Fun text */}
            <p
              className="text-xs text-center mb-3"
              style={{ color: 'var(--text-secondary)', animation: 'fadeIn 800ms ease-out' }}
            >
              {catFact}
            </p>

            {/* Refresh button */}
            <button
              onClick={refreshCat}
              className="px-3 py-1.5 text-[10px] rounded-full border transition-colors hover:bg-[var(--bg-card)]"
              style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}
            >
              New cat
            </button>
          </div>
        </div>
      </div>

      {/* Frame zoom overlay */}
      {zoomedFrame && (
        <div
          className="fixed inset-0 z-[400] flex items-center justify-center p-8"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)', animation: 'fadeIn 150ms ease-out' }}
          onClick={(e) => { e.stopPropagation(); setZoomedFrame(null) }}
        >
          <div className="relative max-w-4xl max-h-full" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomedFrame}
              alt="Frame preview"
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
            />
            <button
              onClick={() => setZoomedFrame(null)}
              className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
              style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-lg)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
