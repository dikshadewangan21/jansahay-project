const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const activeLevel = process.env.NODE_ENV === 'production' ? LEVELS.INFO : LEVELS.DEBUG;

function emit(level, message, meta = {}) {
  if (LEVELS[level] < activeLevel) return;
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...(Object.keys(meta).length ? { ctx: meta } : {}),
  };
  (level === 'ERROR' ? console.error : console.log)(JSON.stringify(entry));
}

module.exports = {
  debug: (msg, meta) => emit('DEBUG', msg, meta),
  info:  (msg, meta) => emit('INFO',  msg, meta),
  warn:  (msg, meta) => emit('WARN',  msg, meta),
  error: (msg, meta) => emit('ERROR', msg, meta),
};
