const LOCAL_DEVELOPMENT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000'
];

const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const compilePreviewHostPattern = pattern => {
  if (!pattern) return null;

  const normalized = pattern.trim().toLowerCase();
  if (
    !normalized.endsWith('.vercel.app') ||
    normalized === '*.vercel.app' ||
    normalized.includes('://') ||
    normalized.includes('/') ||
    (normalized.match(/\*/g) || []).length !== 1
  ) {
    throw new Error(
      'VERCEL_PREVIEW_FRONTEND_HOST_PATTERN must be a scoped .vercel.app hostname containing exactly one *'
    );
  }

  return new RegExp(`^${normalized.split('*').map(escapeRegExp).join('[a-z0-9-]+')}$`, 'i');
};

export const createCorsOptions = (env = process.env) => {
  const allowedOrigins = new Set([
    env.FRONTEND_ORIGIN,
    ...(env.EXTRA_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean),
    ...LOCAL_DEVELOPMENT_ORIGINS
  ].filter(Boolean).map(value => value.replace(/\/$/, '')));

  const previewHostPattern = compilePreviewHostPattern(env.VERCEL_PREVIEW_FRONTEND_HOST_PATTERN);

  return {
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/$/, '');
      if (allowedOrigins.has(normalizedOrigin)) return callback(null, true);

      if (previewHostPattern) {
        try {
          const url = new URL(normalizedOrigin);
          if (
            url.protocol === 'https:' &&
            !url.port &&
            url.pathname === '/' &&
            !url.search &&
            !url.hash &&
            previewHostPattern.test(url.hostname)
          ) {
            return callback(null, true);
          }
        } catch {
          // Invalid origins are rejected below.
        }
      }

      console.warn(`CORS: blocked origin ${origin}`);
      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-CSRF-Token']
  };
};
