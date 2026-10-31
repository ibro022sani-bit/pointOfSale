import supabase from './supabase.js'

const clientIp = (req) =>
  req.headers['x-vercel-forwarded-for'] ||
  req.headers['x-real-ip'] ||
  (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
  req.socket?.remoteAddress ||
  'unknown'

// Returns true if allowed. Fails OPEN if the limiter itself has a problem,
// so a database blip can never lock everyone out of logging in.
export async function hit(key, limit, windowSeconds) {
  try {
    const { data, error } = await supabase.rpc('rate_limit_hit', {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    })
    if (error) {
      console.error('Rate limit error:', error.message)
      return true
    }
    return data === true
  } catch (err) {
    console.error('Rate limit error:', err.message)
    return true
  }
}

const TOO_MANY = { success: false, message: 'Too many attempts. Please wait a few minutes and try again.' }

// Limit by client IP
export function rateLimit(name, limit, windowSeconds) {
  return async (req, res, next) => {
    if (!(await hit(`${name}:${clientIp(req)}`, limit, windowSeconds))) return res.status(429).json(TOO_MANY)
    next()
  }
}

// Limit by a value in the request body (e.g. the email being guessed)
export function rateLimitBody(name, field, limit, windowSeconds) {
  return async (req, res, next) => {
    const value = String(req.body?.[field] || '').trim().toLowerCase()
    if (!value) return next()
    if (!(await hit(`${name}:${value}`, limit, windowSeconds))) return res.status(429).json(TOO_MANY)
    next()
  }
}