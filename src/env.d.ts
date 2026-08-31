/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace Cloudflare {
  interface Env {
    ADAM_CHECKIN_TOKEN?: string
    YAGIZ_CHECKIN_TOKEN?: string
  }
}
