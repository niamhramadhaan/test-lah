/**
 * Extract key frames from a video file as image data URIs.
 *
 * Strategy:
 *  - Seek to evenly-spaced positions across the video duration.
 *  - For short videos (≤10s) grab 4 frames; for longer ones grab up to 8.
 *  - Each frame is rendered to an off-screen canvas and exported as JPEG data URI.
 */

const MAX_FRAMES_SHORT = 4   // videos ≤ 10s
const MAX_FRAMES_LONG = 8    // videos > 10s
const LONG_VIDEO_THRESHOLD = 10 // seconds
const FRAME_QUALITY = 0.82
const MAX_FRAME_WIDTH = 1280   // cap to keep token cost reasonable

export interface VideoFrameResult {
  frames: string[]       // JPEG data URIs
  duration: number       // seconds
  thumbnail: string      // first frame as JPEG data URI
}

/**
 * Extract frames from a video File and return them as JPEG data URIs.
 */
export async function extractVideoFrames(file: File): Promise<VideoFrameResult> {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.muted = true
  video.preload = 'auto'
  video.crossOrigin = 'anonymous'

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve()
    video.onerror = () => reject(new Error('Failed to load video'))
    video.src = url
  })

  // Wait for seeking capability
  await video.play().catch(() => {})
  video.pause()

  const duration = video.duration
  if (!isFinite(duration) || duration <= 0) {
    URL.revokeObjectURL(url)
    throw new Error('Could not determine video duration')
  }

  const maxFrames = duration <= LONG_VIDEO_THRESHOLD ? MAX_FRAMES_SHORT : MAX_FRAMES_LONG
  const frameCount = Math.min(maxFrames, Math.ceil(duration)) // at most 1 per second

  // Calculate seek timestamps (skip first 0.1s to avoid black frames)
  const timestamps: number[] = []
  for (let i = 0; i < frameCount; i++) {
    const t = 0.1 + (i / frameCount) * (duration - 0.2)
    timestamps.push(Math.min(t, duration - 0.05))
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  const frames: string[] = []

  for (const time of timestamps) {
    await seekTo(video, time)
    const frame = captureFrame(video, canvas, ctx)
    frames.push(frame)
  }

  URL.revokeObjectURL(url)

  return {
    frames,
    duration,
    thumbnail: frames[0] ?? '',
  }
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked)
      // Small delay to ensure frame is painted
      requestAnimationFrame(() => resolve())
    }
    video.addEventListener('seeked', onSeeked)
    video.currentTime = time
  })
}

function captureFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): string {
  const { videoWidth, videoHeight } = video
  const scale = videoWidth > MAX_FRAME_WIDTH ? MAX_FRAME_WIDTH / videoWidth : 1
  canvas.width = Math.round(videoWidth * scale)
  canvas.height = Math.round(videoHeight * scale)
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', FRAME_QUALITY)
}

/**
 * Convert a video File to image data URIs (convenience wrapper).
 * Returns an empty array if extraction fails.
 */
export async function videoToImages(file: File): Promise<string[]> {
  try {
    const result = await extractVideoFrames(file)
    return result.frames
  } catch {
    return []
  }
}
