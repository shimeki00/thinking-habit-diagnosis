import { Answer } from '@/types/diagnosis'

export const STORAGE_KEYS = {
  profile: 'thd_profile',
  answers: 'thd_answers',
  saved: 'thd_saved',
  responseId: 'thd_response_id',
} as const

export type Profile = {
  name: string
  email: string
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // localStorageが使えない環境でも壊さない
  }
}

export function getProfile(): Profile {
  return read<Profile>(STORAGE_KEYS.profile, { name: '', email: '' })
}

export function setProfile(profile: Profile) {
  write(STORAGE_KEYS.profile, profile)
}

export function getAnswers(): Record<string, Answer> {
  return read<Record<string, Answer>>(STORAGE_KEYS.answers, {})
}

export function setAnswers(answers: Record<string, Answer>) {
  write(STORAGE_KEYS.answers, answers)
}

export function isSaved(): boolean {
  return read<boolean>(STORAGE_KEYS.saved, false)
}

export function setSaved(value: boolean) {
  write(STORAGE_KEYS.saved, value)
}

export function getResponseId(): string | null {
  return read<string | null>(STORAGE_KEYS.responseId, null)
}

export function setResponseId(id: string) {
  write(STORAGE_KEYS.responseId, id)
}

export function clearDiagnosis() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEYS.answers)
  window.localStorage.removeItem(STORAGE_KEYS.saved)
  window.localStorage.removeItem(STORAGE_KEYS.responseId)
}
