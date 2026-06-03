'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ShineBorder } from '@/components/ui/shine-border'
import { Particles } from '@/components/ui/particles'
import { MorphingText } from '@/components/ui/morphing-text'
import { SparklesText } from '@/components/ui/sparkles-text'
import { DenialModal } from '@/components/shared/DenialModal'
import { useAuth } from '@/hooks/useAuth'
import { useProgress } from '@/components/shared/GlobalProgress'
import confetti from 'canvas-confetti'
import { DotLottie } from '@lottiefiles/dotlottie-web'

interface WeatherData {
  temperature: number
  condition: string
  icon: string
  mood: 'good' | 'neutral' | 'bad'
}

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const { startProgress, completeProgress } = useProgress()
  const [name, setName] = useState('')
  const [denied, setDenied] = useState(false)
  const [shaking, setShaking] = useState(false)
  const [success, setSuccess] = useState(false)
  const [greeting, setGreeting] = useState('')
  const [focused, setFocused] = useState(false)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const lottieCanvasRef = useRef<HTMLCanvasElement>(null)
  const lottieRef = useRef<DotLottie | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Fetch weather (Jakarta default)
  useEffect(() => {
    fetch('/api/weather')
      .then(r => r.json())
      .then(data => {
        if (!data.error) setWeather(data)
      })
      .catch(() => {})
      .finally(() => setWeatherLoading(false))
  }, [])

  // Init Lottie
  useEffect(() => {
    if (!lottieCanvasRef.current || success) return
    try {
      const dotLottie = new DotLottie({
        canvas: lottieCanvasRef.current,
        src: 'https://lottie.host/5a1f1ad0-5c7c-4b9f-bf7e-af80932fa825/bcLfZ9imY4.lottie',
        autoplay: true,
        loop: true,
      })
      lottieRef.current = dotLottie
      return () => { dotLottie.destroy(); lottieRef.current = null }
    } catch {}
  }, [success])

  const fireConfetti = useCallback(() => {
    const duration = 2000
    const end = Date.now() + duration
    const colors = ['#A8A49E', '#81C784', '#FFD54F', '#FFB74D', '#64B5F6']
    const frame = () => {
      confetti({ particleCount: 2, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors })
      confetti({ particleCount: 2, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
  }, [])

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    if (!name.trim()) return
    if (name.trim().toLowerCase().includes('ayu')) {
      setSuccess(true)
      setGreeting(name.trim())
      login(name.trim())
      fireConfetti()
      setTimeout(() => {
        startProgress('Redirecting...')
        router.push('/projects')
      }, 2500)
    } else {
      setShaking(true)
      setTimeout(() => { setShaking(false); setDenied(true) }, 400)
    }
  }, [name, login, router, fireConfetti, startProgress])

  if (success) {
    return (
      <div className="h-screen w-screen flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <Particles className="absolute inset-0" quantity={100} color="#81C784" size={1.0} staticity={25} ease={60} />
        <div className="relative z-10 flex flex-col items-center justify-center">
          <MorphingText
            texts={['Halo,', greeting + '!']}
            className="text-5xl font-bold"
          />
          <p className="text-sm mt-6" style={{ color: 'var(--text-tertiary)', animation: 'fadeInUp 0.6s ease-out 0.5s forwards', opacity: 0 }}>
            Selamat datang di Test Lah!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Particles className="absolute inset-0" quantity={120} color="#81C784" size={1.2} staticity={20} ease={60} />

      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 30% 20%, rgba(129,199,132,0.12) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(255,213,79,0.08) 0%, transparent 60%)'
      }} />

      {/* Main layout — two columns */}
      <div className="relative z-10 flex items-center gap-10 max-w-5xl mx-4 w-full">

        {/* Left: Login card */}
        <div
          className="w-full max-w-md flex-shrink-0"
          style={{ animation: shaking ? 'shake 0.4s ease-in-out' : 'fadeInUp 0.6s ease-out' }}
        >
          <div className="relative">
            <ShineBorder
              className="rounded-2xl"
              shineColor={["#A8A49E", "#81C784", "#FFD54F"]}
              duration={8}
              borderWidth={2}
            />

            <div className="relative rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', boxShadow: '0 12px 40px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)' }}>
              <div className="h-2" style={{ background: 'linear-gradient(90deg, #A8A49E, #81C784, #FFD54F, #FFB74D, #A8A49E)', backgroundSize: '200% 100%', animation: 'shimmer 3s linear infinite' }} />

              <div className="p-8 pt-7">
                {/* Logo */}
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white p-1.5" style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)' }}>
                    <img
                      src="https://static.vecteezy.com/system/resources/thumbnails/067/162/149/small/cute-duck-meme-sticker-transparent-cute-illustration-free-png.png"
                      alt="Logo"
                      width={64}
                      height={64}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                <h1 className="text-center text-xl font-bold mb-1 tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Welcome to Test Lah!
                </h1>
                <p className="text-center text-xs mb-6" style={{ color: 'var(--text-tertiary)' }}>
                  Your one-stop QA companion. Let&apos;s get testing!
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="text-xs font-semibold block mb-2 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                      Your Name
                    </label>
                    <div className="relative">
                      <input
                        ref={inputRef}
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        className="w-full pl-10 pr-4 py-3.5 text-sm rounded-xl outline-none transition-all duration-200"
                        style={{
                          border: `1.5px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
                          backgroundColor: focused ? 'var(--bg-card)' : 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          boxShadow: focused ? '0 0 0 3px rgba(26,26,26,0.06)' : 'none',
                        }}
                      />
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: focused ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 text-sm font-semibold rounded-xl transition-all duration-200 hover:opacity-90 active:scale-[0.98] relative overflow-hidden group"
                    style={{
                      background: 'linear-gradient(135deg, var(--accent) 0%, #333 100%)',
                      color: 'var(--bg-primary)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                    }}
                  >
                    Enter Dashboard
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </form>

                <p className="text-center text-[10px] mt-5" style={{ color: 'var(--text-tertiary)' }}>
                  Authorized access only. Built with love for QA warriors.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Weather + Lottie + Text */}
        <div
          className="hidden lg:flex flex-1 flex-col items-center justify-center gap-6"
          style={{ animation: 'fadeInUp 0.8s ease-out 0.2s backwards' }}
        >
          {/* Sparkles title */}
          <SparklesText
            className="text-center text-2xl font-bold leading-tight"
            sparklesCount={8}
            colors={{ first: '#FFD54F', second: '#81C784' }}
          >
            What a Good Weather
            <br />
            we have here..
          </SparklesText>

          {/* Weather badge — big */}
          {!weatherLoading && weather && (
            <div
              className="flex items-center gap-4 px-6 py-3 rounded-2xl transition-all hover:scale-105"
              style={{
                backgroundColor: weather.mood === 'good' ? 'var(--status-pass-bg)' : 'var(--bg-secondary)',
                border: `1px solid ${weather.mood === 'good' ? 'var(--status-pass-text)' : 'var(--border)'}`,
                animation: 'fadeInUp 0.5s ease-out 0.3s backwards',
              }}
            >
              <span className="text-4xl">{weather.icon}</span>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{weather.temperature}°C</p>
                <p className="text-xs font-medium" style={{ color: weather.mood === 'good' ? 'var(--status-pass-text)' : 'var(--text-secondary)' }}>
                  {weather.condition}
                </p>
              </div>
            </div>
          )}

          {/* Lottie animation */}
          <canvas
            ref={lottieCanvasRef}
            className="w-full max-w-sm rounded-2xl"
            style={{ height: 280 }}
          />

          {/* Subtitle below animation */}
          <div className="text-center" style={{ animation: 'fadeInUp 0.6s ease-out 0.6s backwards' }}>
            <p className="text-sm mb-1" style={{ color: 'var(--text-tertiary)' }}>
              Isn&apos;t it a good time for you to...
            </p>
            <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Test your Project??
            </p>
          </div>
        </div>
      </div>

      <DenialModal
        open={denied}
        onClose={() => setDenied(false)}
        onTryAgain={() => { setDenied(false); setName('') }}
      />

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>
    </div>
  )
}
