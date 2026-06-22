// Structured JSON logging — readable by Vercel Log Drains and Sentry
// Replace console.error() calls with logger.error() for searchable production logs.

type LogCtx = Record<string, unknown>

function emit(level: 'error' | 'warn' | 'info', msg: string, ctx?: LogCtx) {
  const entry = JSON.stringify({
    level,
    msg,
    ts: new Date().toISOString(),
    ...ctx,
  })
  if (level === 'error') console.error(entry)
  else if (level === 'warn')  console.warn(entry)
  else                        console.log(entry)
}

export const logger = {
  error: (msg: string, ctx?: LogCtx) => emit('error', msg, ctx),
  warn:  (msg: string, ctx?: LogCtx) => emit('warn',  msg, ctx),
  info:  (msg: string, ctx?: LogCtx) => emit('info',  msg, ctx),
}
