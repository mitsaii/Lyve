'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

interface SplashScreenProps {
  /** Duration in ms before calling onComplete (default: 2200) */
  duration?: number
  onComplete?: () => void
}

export default function SplashScreen({
  duration = 2200,
  onComplete,
}: SplashScreenProps) {
  const [phase, setPhase] = useState<'visible' | 'fading' | 'done'>('visible')
  const particlesRef = useRef<HTMLDivElement>(null)

  // Generate particles on mount
  useEffect(() => {
    const container = particlesRef.current
    if (!container) return

    const colors = [
      'rgba(220, 100, 255, 0.9)',
      'rgba(180, 60, 240, 0.8)',
      'rgba(255, 140, 240, 0.7)',
      'rgba(255, 255, 255, 0.85)',
      'rgba(160, 80, 255, 0.75)',
    ]

    for (let i = 0; i < 28; i++) {
      const el = document.createElement('div')
      const size = 2 + Math.random() * 4
      const angle = Math.random() * 360
      const dist = 80 + Math.random() * 220
      const tx = Math.cos((angle * Math.PI) / 180) * dist
      const ty = Math.sin((angle * Math.PI) / 180) * dist
      const color = colors[Math.floor(Math.random() * colors.length)]

      const s = el.style as unknown as Record<string, string>
      s.position = 'absolute'
      s.borderRadius = '50%'
      s.width = `${size}px`
      s.height = `${size}px`
      s.background = color
      s.left = `calc(50% + ${(Math.random() - 0.5) * 60}px)`
      s.top = `calc(42% + ${(Math.random() - 0.5) * 40}px)`
      s.boxShadow = `0 0 ${size * 2}px ${color}`
      s.animation = `lyveSplashParticle ${0.8 + Math.random() * 0.7}s ${0.3 + Math.random() * 0.6}s ease-out forwards`
      s['--tx'] = `${tx}px`
      s['--ty'] = `${ty}px`
      s['--s'] = `${0.3 + Math.random() * 0.7}`
      s.opacity = '0'

      container.appendChild(el)
    }

    return () => {
      container.innerHTML = ''
    }
  }, [])

  // Fade out and call onComplete
  useEffect(() => {
    const fadeTimer = setTimeout(() => setPhase('fading'), duration - 450)
    const doneTimer = setTimeout(() => {
      setPhase('done')
      onComplete?.()
    }, duration)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(doneTimer)
    }
  }, [duration, onComplete])

  if (phase === 'done') return null

  return (
    <>
      <style>{`
        @keyframes lyveSplashBgPulse {
          0%   { opacity: 0; transform: scale(0.8); }
          40%  { opacity: 1; transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes lyveSplashLogoEntrance {
          0%   { opacity: 0; transform: scale(0.72) translateY(16px); filter: blur(8px); }
          60%  { opacity: 1; filter: blur(0); }
          80%  { transform: scale(1.04) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
        }
        @keyframes lyveSplashLogoGlow {
          0%   { filter: drop-shadow(0 0 28px rgba(200,80,255,0.55)) drop-shadow(0 0 8px rgba(255,80,220,0.4)); }
          50%  { filter: drop-shadow(0 0 48px rgba(200,80,255,0.85)) drop-shadow(0 0 20px rgba(255,80,220,0.7)); }
          100% { filter: drop-shadow(0 0 32px rgba(200,80,255,0.65)) drop-shadow(0 0 12px rgba(255,80,220,0.5)); }
        }
        @keyframes lyveSplashSweep {
          0%   { left: -80%; opacity: 0; }
          10%  { opacity: 1; }
          100% { left: 130%; opacity: 0; }
        }
        @keyframes lyveSplashFadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lyveSplashDotPulse {
          from { transform: scale(0.7); opacity: 0.4; background: rgba(200,100,255,0.5); }
          to   { transform: scale(1.3); opacity: 1;   background: rgba(230,140,255,1); }
        }
        @keyframes lyveSplashParticle {
          0%   { opacity: 0; transform: translate(0, 0) scale(0); }
          20%  { opacity: 1; }
          100% { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(var(--s)); }
        }
        @keyframes lyveSplashFadeOut {
          to { opacity: 0; }
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: '#0a0010',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          animation:
            phase === 'fading'
              ? 'lyveSplashFadeOut 0.45s ease-in forwards'
              : undefined,
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 80% 60% at 50% 55%, rgba(140,40,200,0.18) 0%, rgba(80,0,140,0.10) 45%, transparent 100%)',
            animation: 'lyveSplashBgPulse 2s ease-out forwards',
            opacity: 0,
          }}
        />

        {/* Particles */}
        <div
          ref={particlesRef}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        />

        {/* Main stage */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 28,
          }}
        >
          {/* Logo + sweep */}
          <div
            style={{
              position: 'relative',
              animation:
                'lyveSplashLogoEntrance 0.85s cubic-bezier(0.16,1,0.3,1) 0.2s both',
            }}
          >
            {/* Sweep shine */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '60%',
                height: '100%',
                background:
                  'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)',
                borderRadius: '50%',
                animation: 'lyveSplashSweep 0.6s ease-in-out 0.75s forwards',
                opacity: 0,
                pointerEvents: 'none',
              }}
            />
            <Image
              src="/lyve-logo.png"
              alt="Lyve"
              width={280}
              height={120}
              priority
              style={{
                width: 280,
                height: 'auto',
                display: 'block',
                animation:
                  'lyveSplashLogoGlow 2s ease-in-out 0.8s forwards',
                filter:
                  'drop-shadow(0 0 28px rgba(200,80,255,0.55)) drop-shadow(0 0 8px rgba(255,80,220,0.4))',
              }}
            />
          </div>

          {/* Loading dots */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              animation: 'lyveSplashFadeInUp 0.5s ease-out 1.1s both',
              opacity: 0,
            }}
          >
            {[0, 0.18, 0.36].map((delay, i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'rgba(200,100,255,0.6)',
                  animation: `lyveSplashDotPulse 1s ease-in-out ${delay}s infinite alternate`,
                }}
              />
            ))}
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 11,
              letterSpacing: '3.5px',
              textTransform: 'uppercase',
              color: 'rgba(200,140,255,0.55)',
              fontWeight: 300,
              animation: 'lyveSplashFadeInUp 0.6s ease-out 1.3s both',
              opacity: 0,
            }}
          >
            Your Live Music Universe
          </div>
        </div>
      </div>
    </>
  )
}
