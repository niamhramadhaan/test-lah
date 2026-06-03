'use client'

import { useLocalStorage } from './useLocalStorage'
import { UserProfile } from '@/types'

const DEFAULT_PROFILE: UserProfile = { name: '', bannerColor: '#64B5F6', avatarUrl: '', role: 'QA Engineer' }

export function useProfile() {
  const [profile, setProfile] = useLocalStorage<UserProfile>('qa-profile', DEFAULT_PROFILE)

  const setName = (name: string) => setProfile(prev => ({ ...prev, name }))
  const setBannerColor = (color: string) => setProfile(prev => ({ ...prev, bannerColor: color }))
  const setAvatarUrl = (url: string) => setProfile(prev => ({ ...prev, avatarUrl: url }))
  const setRole = (role: string) => setProfile(prev => ({ ...prev, role }))

  const initials = profile.name
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'

  return { profile, setName, setBannerColor, setAvatarUrl, setRole, initials }
}
