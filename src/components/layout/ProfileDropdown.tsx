'use client'

import { useState, useRef, useEffect } from 'react'
import { UserProfile, AVATAR_COLORS } from '@/types'

const AVATAR_URLS = [
  'https://cdn.jsdelivr.net/gh/alohe/avatars/png/upstream_11.png',
  'https://cdn.jsdelivr.net/gh/alohe/avatars/png/upstream_12.png',
  'https://cdn.jsdelivr.net/gh/alohe/avatars/png/upstream_13.png',
  'https://cdn.jsdelivr.net/gh/alohe/avatars/png/upstream_14.png',
  'https://cdn.jsdelivr.net/gh/alohe/avatars/png/upstream_15.png',
  'https://cdn.jsdelivr.net/gh/alohe/avatars/png/upstream_16.png',
  'https://cdn.jsdelivr.net/gh/alohe/avatars/png/upstream_17.png',
  'https://cdn.jsdelivr.net/gh/alohe/avatars/png/upstream_18.png',
  'https://cdn.jsdelivr.net/gh/alohe/avatars/png/upstream_19.png',
  'https://cdn.jsdelivr.net/gh/alohe/avatars/png/upstream_20.png',
  'https://cdn.jsdelivr.net/gh/alohe/avatars/png/upstream_21.png',
  'https://cdn.jsdelivr.net/gh/alohe/avatars/png/upstream_22.png',
]

const ROLES = [
  'QA Engineer',
  'QA Lead',
  'Developer',
  'Designer',
  'Manager',
]

function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + Math.round((255 - (num >> 16)) * amount))
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round((255 - ((num >> 8) & 0xff)) * amount))
  const b = Math.min(255, (num & 0xff) + Math.round((255 - (num & 0xff)) * amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - Math.round((num >> 16) * amount))
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(((num >> 8) & 0xff) * amount))
  const b = Math.max(0, (num & 0xff) - Math.round(((num & 0xff)) * amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

interface ProfileDropdownProps {
  profile: UserProfile
  initials: string
  onSetName: (name: string) => void
  onSetBannerColor: (color: string) => void
  onSetAvatarUrl: (url: string) => void
  onSetRole: (role: string) => void
}

export function ProfileDropdown({ profile, initials, onSetName, onSetBannerColor, onSetAvatarUrl, onSetRole }: ProfileDropdownProps) {
  const [open, setOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [editingRole, setEditingRole] = useState(false)
  const [nameValue, setNameValue] = useState(profile.name)
  const [roleValue, setRoleValue] = useState(profile.role || '')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const roleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (editingName && inputRef.current) inputRef.current.focus()
  }, [editingName])

  useEffect(() => {
    if (editingRole && roleInputRef.current) roleInputRef.current.focus()
  }, [editingRole])

  const commitName = () => {
    onSetName(nameValue.trim())
    setEditingName(false)
  }

  const commitRole = () => {
    onSetRole(roleValue.trim())
    setEditingRole(false)
  }

  const hasAvatar = !!profile.avatarUrl

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium overflow-hidden border-2 transition-all hover:scale-105"
        style={{
          borderColor: open ? 'var(--accent)' : 'transparent',
          boxShadow: open ? '0 0 0 2px var(--accent), 0 2px 8px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        {hasAvatar ? (
          <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <span
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: profile.bannerColor, color: '#fff' }}
          >
            {initials}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 border z-50 overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xl)',
            animation: 'fadeIn 150ms ease-out',
          }}
        >
          {/* Profile card header */}
          <div
            className="relative px-5 pt-5 pb-4"
            style={{
              background: `linear-gradient(135deg, ${profile.bannerColor} 0%, ${lightenColor(profile.bannerColor, 0.4)} 50%, ${profile.bannerColor} 100%)`,
            }}
          >
            {/* Decorative pattern */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
                backgroundSize: '30px 30px',
              }}
            />

            <div className="relative flex items-end gap-4">
              {/* Large avatar */}
              <div className="relative group">
                <div
                  className="w-16 h-16 rounded-xl overflow-hidden border-3 flex-shrink-0"
                  style={{
                    borderColor: 'rgba(255,255,255,0.3)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  }}
                >
                  {hasAvatar ? (
                    <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-xl font-bold"
                      style={{ backgroundColor: profile.bannerColor, color: '#fff' }}
                    >
                      {initials}
                    </div>
                  )}
                </div>
                <div
                  className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                  style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
                  onClick={(e) => { e.stopPropagation(); /* scroll to gallery */ document.getElementById('avatar-gallery')?.scrollIntoView({ behavior: 'smooth' }) }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                    <path d="M14 11V14H2V11H0V14C0 15.1.9 16 2 16H14C15.1 16 16 15.1 16 14V11H14ZM7 9L4.5 6.5L3 8L8 13L13 8L11.5 6.5L9 9V0H7V9Z" />
                  </svg>
                </div>
              </div>

              {/* Name + Role */}
              <div className="flex-1 min-w-0 pb-1">
                {editingName ? (
                  <input
                    ref={inputRef}
                    value={nameValue}
                    onChange={e => setNameValue(e.target.value)}
                    onBlur={commitName}
                    onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') setEditingName(false) }}
                    className="w-full bg-white/20 backdrop-blur-sm outline-none text-white text-sm font-semibold px-2 py-1 rounded placeholder-white/50"
                    placeholder="Your name..."
                  />
                ) : (
                  <div
                    className="text-sm font-semibold text-white cursor-pointer hover:opacity-80 truncate"
                    onClick={() => { setNameValue(profile.name); setEditingName(true) }}
                  >
                    {profile.name || 'Click to set name'}
                  </div>
                )}
                <div
                  className="text-[11px] mt-0.5 px-2 py-0.5 rounded-full inline-block cursor-pointer hover:opacity-80"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)' }}
                  onClick={() => { setRoleValue(profile.role || ''); setEditingRole(true) }}
                >
                  {editingRole ? (
                    <input
                      ref={roleInputRef}
                      value={roleValue}
                      onChange={e => setRoleValue(e.target.value)}
                      onBlur={commitRole}
                      onKeyDown={e => { if (e.key === 'Enter') commitRole(); if (e.key === 'Escape') setEditingRole(false) }}
                      className="bg-transparent outline-none text-white text-[11px] w-24 placeholder-white/50"
                      placeholder="Your role..."
                    />
                  ) : (
                    profile.role || 'Set role...'
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick role selector */}
          <div className="px-4 pt-3 pb-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
              Role
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ROLES.map(role => (
                <button
                  key={role}
                  onClick={() => onSetRole(role)}
                  className="px-2 py-1 text-[10px] rounded-md border transition-colors"
                  style={{
                    borderColor: profile.role === role ? 'var(--accent)' : 'var(--border)',
                    color: profile.role === role ? 'var(--accent)' : 'var(--text-secondary)',
                    backgroundColor: profile.role === role ? 'var(--accent)' + '10' : 'transparent',
                    fontWeight: profile.role === role ? 600 : 400,
                  }}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Avatar gallery */}
          <div id="avatar-gallery" className="px-4 pt-2 pb-3">
            <label className="text-[10px] font-semibold uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
              Choose Avatar
            </label>
            <div className="grid grid-cols-6 gap-2">
              {AVATAR_URLS.map((url, i) => (
                <button
                  key={url}
                  onClick={() => onSetAvatarUrl(url)}
                  className="w-10 h-10 rounded-lg overflow-hidden border-2 transition-all hover:scale-110 hover:shadow-md"
                  style={{
                    borderColor: profile.avatarUrl === url ? 'var(--accent)' : 'transparent',
                    boxShadow: profile.avatarUrl === url ? '0 0 0 2px var(--accent)' : 'none',
                  }}
                >
                  <img src={url} alt={`Avatar ${i + 11}`} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div className="px-4 pb-4">
            <label className="text-[10px] font-semibold uppercase tracking-wider block mb-2" style={{ color: 'var(--text-tertiary)' }}>
              Banner Color
            </label>
            <div className="grid grid-cols-8 gap-1.5">
              {AVATAR_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => onSetBannerColor(color)}
                  className="w-6 h-6 rounded-full transition-transform hover:scale-110 relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${darkenColor(color, 0.3)} 0%, ${color} 50%, ${lightenColor(color, 0.3)} 100%)`,
                    outline: profile.bannerColor === color && !profile.avatarUrl ? '2px solid var(--accent)' : 'none',
                    outlineOffset: 2,
                  }}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                      animation: 'shimmer 2s ease-in-out infinite',
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div
            className="px-4 py-2.5 border-t flex items-center justify-between"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}
          >
            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
              Profile data stored locally
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-[10px] font-medium px-2 py-0.5 rounded"
              style={{ color: 'var(--accent)' }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
