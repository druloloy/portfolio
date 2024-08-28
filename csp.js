const policies = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    'https://www.googletagmanager.com',
    'https://maps.googleapis.com',
    'https://www.google-analytics.com',
  ],
  'child-src': ["'self'"],
  'style-src': [
    "'self'",
    "'unsafe-inline'",
    'https://fonts.googleapis.com',
    'https://www.googletagmanager.com',
  ],
  'img-src': ["'self'", 'https://raw.githubusercontent.com'],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
  'frame-src': ["'self'"],
  'connect-src': ["'self'", 'https://www.google-analytics.com', 'https://maps.googleapis.com'],
}

module.exports = Object.entries(policies)
  .map(([key, value]) => {
    if (Array.isArray(value)) {
      return `${key} ${value.join(' ')}`
    }
    return ''
  })
  .join('; ')
