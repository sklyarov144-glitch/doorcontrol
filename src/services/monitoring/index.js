const dsn = import.meta.env.VITE_SENTRY_DSN;
let sentryPromise;

function getSentry() {
  if (!dsn) return null;
  sentryPromise ??= import("@sentry/react");
  return sentryPromise;
}

export function initMonitoring() {
  if (!dsn) return false;
  getSentry().then((Sentry) => {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_APP_RELEASE,
      sendDefaultPii: false,
      tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
      beforeSend(event) {
        if (event.request) {
          delete event.request.cookies;
          delete event.request.headers;
        }
        if (event.user) event.user = { id: event.user.id, role: event.user.role };
        return event;
      },
    });
  });
  return true;
}

export function captureApplicationError(error, context = {}) {
  if (!dsn) return;
  getSentry().then((Sentry) => Sentry.captureException(error, { extra: context }));
}

export function setMonitoringUser(user) {
  if (!dsn) return;
  getSentry().then((Sentry) => Sentry.setUser(user ? { id: user.id, role: user.role } : null));
}
