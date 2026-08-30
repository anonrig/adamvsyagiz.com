/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface Env {
  ASSETS: Fetcher
  CHECKINS: KVNamespace
  ADAM_CHECKIN_TOKEN?: string
  YAGIZ_CHECKIN_TOKEN?: string
}
