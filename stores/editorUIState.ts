import { defineStore } from "pinia";
import { getEntryPath, type EntryPathEntry, getAtEntryPath } from "~/assets/shared/battlescribe/bs_editor";
import { goodJsonKeys } from "~/assets/shared/battlescribe/bs_main";
import type { EditorBase } from "~/assets/shared/battlescribe/bs_main_catalogue";
import { get_base_from_vue_el, get_ctx } from "./editorStore";

export const useEditorUIState = defineStore("editor-ui", {
  state: () =>
    ({
      catalogues: {},
    } as Record<string, any>),

  persist: {
    storage: globalThis.localStorage,
  },
  actions: {
    collapse_deepest() {
      const cls = `collapsible-box opened`;
      const results = document.documentElement.getElementsByClassName(cls);
      let maxDepth = -1;
      if (results?.length) {
        for (const cur of results) {
          cur.classList.forEach((val) => {
            if (val.startsWith("depth-")) {
              maxDepth = Math.max(maxDepth, parseInt(val.split("-")[1]));
            }
          });
        }
      }
      if (maxDepth >= 0) {
        const deepestCls = `depth-${maxDepth} collapsible-box opened`;
        const results = document.documentElement.getElementsByClassName(deepestCls);
        if (results?.length) {
          for (const cur of results) {
            get_ctx(cur)?.close();
          }
        }
      }
    },
    save(id: string, data: Record<string, any>) {
      // Get all open collapsible boxes and save their state

      function recurseFn(elt: Element, obj: any, depth = 0) {
        const cls = `depth-${depth} collapsible-box opened`;
        const results = elt.getElementsByClassName(cls);
        if (results?.length) {
          for (const cur of results) {
            const item = get_base_from_vue_el(get_ctx(cur));
            const key = item.parentKey;
            const parent = item.parent;

            let next = obj;
            if (parent) {
              const arr = parent[key] as EditorBase[];
              if (!arr || !Array.isArray(arr)) continue;
              const index = arr.indexOf(item);
              if (!(key in obj)) obj[key] = {};
              const obj_arr = obj[key];
              if (!(index in obj_arr)) obj_arr[index] = {};
              next = obj_arr[index];
            } else {
              const keys = [...cur.classList].filter((o) => goodJsonKeys.has(o));
              for (const key of keys) {
                obj[key] = {};
                obj[key][0] = {};
                next = obj[key][0];
              }
            }

            recurseFn(cur, next, depth + 1);
          }
        }
      }
      const result = {};
      recurseFn(document.documentElement, result);
      this.$state.catalogues[id] = { ...data, open: result };
      console.log("saved editor ui state for id", id);
      return result;
    },

    get_data(id: string): Record<string, any> {
      const current = this.$state.catalogues[id];
      if (!current) return {};
      return current;
    },
    get_root(id: string, key: string): boolean {
      let current = this.$state.catalogues[id];
      if (!current) return false;
      current = current.open[key];
      if (!current) return false;
      return true;
    },
    get(id: string, path: EntryPathEntry[]): boolean {
      if (!path.length) return false;
      let current = this.$state.catalogues[id];
      if (!current) return false;
      current = current.open[path[0].key];
      if (!current) return false;
      current = current[0];
      if (!current) return false;
      for (const node of path) {
        const arr = current[node.key];
        if (!arr) return false;
        const entry = arr[node.index];
        if (!entry) return false;
        current = entry;
      }
      return true;
    },
  },
});
