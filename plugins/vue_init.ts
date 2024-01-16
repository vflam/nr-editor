// @ts-ignore
import vClickOutside from "click-outside-vue3";
import Notifications from "@kyvg/vue3-notification";
import type { Router } from "vue-router";
import type { Pinia } from "pinia";
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(vClickOutside);
  nuxtApp.vueApp.use(Notifications);
  (nuxtApp.$pinia as Pinia).use(({ store }) => {
    store.$router = nuxtApp.$router as Router;
  });
  globalThis.$toRaw = toRaw
});
