import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://366e99f7ac588a32e49bd7c06f0b47b9@o4511017304850432.ingest.us.sentry.io/4511017314680832",
  environment: "dev",
  tracesSampleRate: 1.0,
});