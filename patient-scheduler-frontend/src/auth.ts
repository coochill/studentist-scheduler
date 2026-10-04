const AUTH_TOKEN_KEY = 'studentist-auth-token'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api'

export function getAuthToken() {
  return sessionStorage.getItem(AUTH_TOKEN_KEY)
}

export function isAuthenticated() {
  return Boolean(getAuthToken())
}

export async function authenticate(email: string, password: string) {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) return false

  const data = await response.json() as { token?: string }
  if (!data.token) return false

  sessionStorage.setItem(AUTH_TOKEN_KEY, data.token)
  return true
}

export async function endSession() {
  const token = getAuthToken()

  try {
    if (token) {
      await fetch(`${API_URL}/logout`, {
        method: 'POST',
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      })
    }
  } finally {
    sessionStorage.removeItem(AUTH_TOKEN_KEY)
  }
}
