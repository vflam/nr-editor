<template>
  <div class="item unselectable" @click.middle.stop="debug" @contextmenu.stop="contextmenu.show">
    <template v-if="item.editorTypeName === 'catalogue' || item.editorTypeName === 'gameSystem'">
      <div class="head">
        <EditorCollapsibleBox :payload="catalogue" nobox :group="[]" :collapsible="false">
          <template #title
            ><img src="/assets/bsicons/catalogue.png" />
            {{ catalogue.name }}
            <span v-if="getNameExtra(catalogue)" class="gray">&nbsp;{{ getNameExtra(catalogue) }} </span>
          </template>
          <template #content></template>
        </EditorCollapsibleBox>
      </div>

      <template v-for="category of groupedCategories" :key="category.type">
        <EditorCollapsibleBox
          :altclickable="store.can_follow(item) || imported"
          @altclick="onctrlclick"
          :collapsible="category.items.length > 0"
          :group="get_group('entries')"
          :payload="category.type"
          @contextmenu.stop="contextmenu.show($event, category.type)"
          :class="[category.type, category.links, `depth-${depth}`]"
          nobox
          :defcollapsed="!should_be_open(category.type)"
        >
          <template #title>
            <span>
              <span class="typeIcon-wrapper">
                <img class="typeIcon" :src="`./assets/bsicons/${category.icon}`" />
              </span>
              {{ category.name }}
            </span>
          </template>
          <template #content>
            <template v-for="entry of category.items" :key="key(entry.item)">
              <CatalogueEntry
                :item="entry.item"
                :group="get_group(category.type)"
                :forceShowRecursive="forceShow"
                :imported="entry.imported"
                :depth="depth + 1"
              />
            </template>
          </template>
        </EditorCollapsibleBox>
      </template>
    </template>
    <template v-else>
      <EditorCollapsibleBox
        :altclickable="store.can_follow(item) || imported"
        @altclick="onctrlclick"
        :collapsible="mixedChildren && mixedChildren.length > 0"
        :empty="!mixedChildren || mixedChildren.length == 0"
        :group="group || []"
        :payload="item"
        :class="[item.parentKey, `depth-${depth}`]"
        :defcollapsed="!open"
        nobox
      >
        <template #title>
          <span>
            <span class="typeIcon-wrapper">
              <img class="typeIcon" :src="`./assets/bsicons/${item.editorTypeName}.png`" />
            </span>
            <!-- <span v-if="primary" class="text-orange">{{ primary }}</span> -->
            <ErrorIcon :errors="item.errors" />
            <span :class="{ imported: imported, filtered: item.highlight }">
              {{ getName(item) }}
            </span>
            <span v-if="getNameExtra(item)" class="gray">&nbsp;{{ getNameExtra(item) }} </span>
            <span class="ml-10px" v-if="costs" v-html="costs" />
          </span>
        </template>
        <template #content>
          <CatalogueEntry
            v-for="child of mixedChildren"
            :key="key(child.item)"
            :item="child.item"
            :group="get_group('default')"
            :forceShowRecursive="forceShow"
            :imported="imported || child.imported"
            :depth="depth + 1"
          />
        </template>
      </EditorCollapsibleBox>
    </template>

    <ContextMenu v-if="contextmenuopen" v-model="contextmenuopen" ref="contextmenu">
      <template #default="{ payload }">
        <template v-if="!payload && item">
          <div v-if="store.can_follow(item)" @click="store.follow(link)">
            Follow
            <span class="gray" v-if="link.target.catalogue !== item.catalogue">
              &nbsp;({{ link.target.catalogue?.getName() || link.target.getName() }})
            </span>
          </div>
          <div v-if="imported" @click="store.goto(item)">
            Goto
            <span class="gray"> &nbsp;({{ item.catalogue?.getName() }}) </span>
          </div>
          <div v-if="item.links?.length || item.other_links?.length" @click="store.mode = 'references'">
            References ({{ item.links ? item.links.length : 0 }})
          </div>
          <Separator v-if="item.isLink() || item.links || imported" />
        </template>
        <template v-if="payload">
          <div @click="store.create(payload)">
            <img class="pr-4px" :src="`assets/bsicons/${getTypeName(payload)}.png`" />
            {{ getTypeLabel(getTypeName(payload)) }}
          </div>
          <div @click="store.create('entryLinks', { type: 'selectionEntry' })" v-if="payload === 'selectionEntries'">
            <img class="pr-4px" :src="`assets/bsicons/link.png`" />
            Link
          </div>
          <div @click="store.create('infoLinks', { type: 'profile' })" v-if="payload === 'rules'">
            <img class="pr-4px" :src="`assets/bsicons/link.png`" />
            Link
          </div>
          <Separator />
        </template>
        <template v-else>
          <div @click="store.create('forceEntries')" v-if="allowed('forceEntries')">
            <img class="pr-4px" src="assets/bsicons/force.png" />
            Force
          </div>
          <div @click="store.create('categoryLinks')" v-if="allowed('categoryLinks') && item.isForce()">
            <img class="pr-4px" src="assets/bsicons/categoryLink.png" />
            Category
          </div>
          <Separator v-if="allowed(['forces', 'categoryLinks'])" />
          <div @click="store.create('selectionEntries')" v-if="allowed('selectionEntries')">
            <img class="pr-4px" src="assets/bsicons/selectionEntry.png" />
            Entry
          </div>
          <div @click="store.create('selectionEntryGroups')" v-if="allowed('selectionEntryGroups')">
            <img class="pr-4px" src="assets/bsicons/selectionEntryGroup.png" />
            Group
          </div>
          <div @click="store.create('entryLinks', { type: 'selectionEntry' })" v-if="allowed('entryLinks')">
            <img class="pr-4px" src="assets/bsicons/link.png" />
            Link
          </div>
          <Separator v-if="allowed(['selectionEntries', 'selectionEntryGroups', 'entryLinks'])" />
          <div @click="store.create_child('profiles', item)" v-if="allowed('profiles')">
            <img class="pr-4px" src="assets/bsicons/profile.png" />
            Profile
          </div>
          <div @click="store.create('rules')" v-if="allowed('rules')">
            <img class="pr-4px" src="assets/bsicons/rule.png" />
            Rule
          </div>
          <div @click="store.create('infoGroups')" v-if="allowed('infoGroups')">
            <img class="pr-4px" src="assets/bsicons/infoGroup.png" />
            Info Group
          </div>
          <div @click="store.create('infoLinks', { type: 'profile' })" v-if="allowed('infoLinks')">
            <img class="pr-4px" src="assets/bsicons/link.png" />
            Info Link
          </div>
          <!-- <div @click="store.create('associations')" v-if="allowed('associations')">
            <img class="pr-4px" src="assets/bsicons/association.png" />
            Association
          </div> -->
          <Separator v-if="allowed(['profiles', 'rules', 'infoGroups', 'infoLinks'])" />
          <div @click="store.create('conditions')" v-if="allowed('conditions')">
            <img class="pr-4px" src="assets/bsicons/condition.png" />
            Condition
          </div>
          <div @click="store.create('conditionGroups')" v-if="allowed('conditionGroups')">
            <img class="pr-4px" src="assets/bsicons/conditionGroup.png" />
            Condition Group
          </div>
          <div @click="store.create('repeats')" v-if="allowed('repeats')">
            <img class="pr-4px" src="assets/bsicons/repeat.png" />
            Repeat
          </div>
          <Separator v-if="allowed(['conditions', 'conditionGroups', 'repeats'])" />
          <div @click="store.create_child('constraints', item)" v-if="allowed('constraints')">
            <img class="pr-4px" src="assets/bsicons/constraint.png" />
            Constraint
          </div>
          <div @click="store.create('modifiers')" v-if="allowed('modifiers')">
            <img class="pr-4px" src="assets/bsicons/modifier.png" />
            Modifier
          </div>
          <div @click="store.create('modifierGroups')" v-if="allowed('modifierGroups')">
            <img class="pr-4px" src="assets/bsicons/modifierGroup.png" />
            Modifier Group
          </div>
          <Separator v-if="allowed(['constraints', 'modifiers', 'modifierGroups'])" />
        </template>

        <div @click="store.cut" v-if="!payload">Cut<span class="gray absolute right-5px">Ctrl+X</span> </div>
        <div @click="store.copy" v-if="!payload">Copy<span class="gray absolute right-5px">Ctrl+C</span> </div>
        <div @click="store.paste">Paste<span class="gray absolute right-5px">Ctrl+V</span> </div>
        <div @click="store.duplicate" v-if="!payload">Duplicate<span class="gray absolute right-5px">Ctrl+D</span></div>

        <div v-if="!sortable(item.parent)" @click="store.move_up(item)">
          <span> Move Up </span>
        </div>
        <div v-if="!sortable(item.parent)" @click="store.move_down(item)">
          <span> Move Down </span>
        </div>
        <template v-if="!payload && store.get_move_targets(item)?.length">
          <div @mouseover="nestedcontextmenu.show">
            <span> Move To </span>
            <span class="absolute right-5px">❯</span>
          </div>
          <ContextMenu ref="nestedcontextmenu">
            <div
              v-for="target of store.get_move_targets(item)"
              @click="store.move(item, catalogue, target.target, target.type)"
            >
              {{ target.target.name }} -
              {{ target.type }}
            </div>
          </ContextMenu>
        </template>
        <Separator v-if="!payload" />
        <div @click="store.remove()" v-if="!payload">
          <img class="w-12px pr-4px" src="/assets/icons/redcross.png" />Remove<span class="gray absolute right-5px"
            >Del</span
          >
        </div>
      </template>
    </ContextMenu>
  </div>
</template>

<script lang="ts">
import { PropType } from "vue";
import { CatalogueEntryItem } from "@/stores/editorStore";
import { useEditorStore } from "~/stores/editorStore";
import {
  ItemKeys,
  ItemTypes,
  getName,
  getTypeLabel,
  getTypeName,
  systemCategories,
  catalogueCategories,
  getNameExtra,
  getEntryPath,
} from "~/assets/shared/battlescribe/bs_editor";
import { Catalogue, EditorBase } from "~/assets/shared/battlescribe/bs_main_catalogue";
import { Link } from "~/assets/shared/battlescribe/bs_main";
import {
  generateBattlescribeId,
  sortByAscending,
  sortByDescending,
  escapeXml,
} from "~/assets/shared/battlescribe/bs_helpers";
import ContextMenu from "~/components/dialog/ContextMenu.vue";
import EditorCollapsibleBox from "~/components/catalogue/left_panel/components/EditorCollapsibleBox.vue";
import { useEditorUIState } from "~/stores/editorUIState";
import { debug } from "util";
import { useSettingsStore } from "~/stores/settingsState";
import { allowed_children } from "~/assets/shared/battlescribe/bs_convert";
export interface ICost {
  name: string;
  value: number;
  typeId: string;
}
function round(num: number): number {
  return Math.round(num * 100) / 100;
}
export function formatCosts(costs: ICost[]): string {
  let res = "";
  costs = sortByDescending(costs, (c) => c.name);
  for (const cost of costs) {
    if (cost.value != 0) {
      let name = "";
      if (cost.name.length != 0) {
        name = " " + cost.name;
      }
      res = `${res}<span class='cost'>${round(cost.value)}${name}</span>`;
    }
  }
  if (res.length == 0) {
    return res;
  }
  return `<span class="costList">${res}</span>`;
}
const order: Record<string, number> = {
  selectionEntry: 1,
  entryLink: 1,
  selectionEntryGroup: 2,
  entryGroupLink: 2,
  constraint: 3,
  forceEntry: 4,
  profile: 5,
  modifier: 6,
  modifierGroup: 7,
  categoryLink: 8,
  infoLink: 9,
};
const noSort = new Set(["force"]);

const preferOpen = new Set(["modifierGroups", "conditionGroups"]);
const hiddenTypes = new Set(["characteristicTypes", "characteristics", "costs"]);
export default {
  name: "CatalogueEntry",
  components: {
    ContextMenu,
    EditorCollapsibleBox,
  },
  setup() {
    return { store: useEditorStore(), state: useEditorUIState(), settings: useSettingsStore() };
  },
  props: {
    item: {
      type: Object as PropType<EditorBase>,
      required: true,
    },
    group: {
      type: Array,
    },
    forceShowRecursive: {
      type: Boolean,
      default: false,
    },
    showImported: {
      type: Boolean,
    },
    imported: {
      type: Boolean,
    },
    depth: {
      type: Number,
      default: 0,
    },
  },
  data() {
    return {
      groups: {} as Record<string, any>,
      contextmenuopen: false,
      open: false,
      open_categories: undefined as Set<string> | undefined,
    };
  },
  mounted() {
    if (this.catalogue) {
      this.catalogue.processForEditor();
      if (!this.imported) {
        this.open = preferOpen.has(this.item.parentKey) || this.state.get(this.catalogue.id, getEntryPath(this.item));
        if (this.item.isCatalogue()) {
          const openCategories = new Set<string>();
          for (const category of this.categories) {
            if (this.state.get_root(this.catalogue.id, category.type)) {
              openCategories.add(category.type);
            }
          }
          this.open_categories = openCategories;
        }
      }
    }
  },
  methods: {
    escapeXml,
    getTypeName,
    getTypeLabel,
    getName,
    getNameExtra,
    key(entry: EditorBase | any): string {
      if (entry.id) {
        return entry.id;
      } else if (entry["$id"]) {
        return entry["$id"];
      } else {
        entry["$id"] = `temp-${generateBattlescribeId()}`;
        return entry["$id"];
      }
    },

    should_be_open(category: string) {
      return this.open_categories?.has(category);
    },
    sortable(entry?: EditorBase) {
      if (this.settings.sort === "none") return false;
      if (!entry) return true;
      return noSort.has(entry.editorTypeName) === false;
    },
    get_group(key: string) {
      if (!(key in this.groups)) {
        this.groups[key] = [];
      }
      return this.groups[key];
    },
    ref_count(item: EditorBase) {
      switch (item.editorTypeName) {
        case "category":
        default:
          return item.links?.length;
      }
    },
    async onctrlclick() {
      if (this.store.can_follow(this.item)) {
        await this.store.follow(this.item as EditorBase & Link);
      } else if (this.imported) {
        await this.store.goto(this.item);
      } else if (this.item.links || this.item.other_links) {
        this.store.mode = "references";
      }
    },
    debug() {
      console.log(this.item.name, this.item.editorTypeName, toRaw(this.item));
      console.log("component", this);
      console.log(this.allowedChildren);
    },
    getTypedArray(item: Catalogue, type: ItemKeys, output: CatalogueEntryItem[]) {
      if (!type) return;
      const key = type as keyof Catalogue;
      const found = item[key];
      if (found && Array.isArray(found)) {
        for (const child of found) {
          if (!this.filter_child(child as EditorBase)) continue;
          output.push({ item: child as ItemTypes & EditorBase, type });
        }
      }
      if (this.showImported) {
        const useRoot = ["selectionEntries", "selectionEntryLinks", "rules"];
        const imports = useRoot.includes(type) ? item.importsWithEntries : item.imports;
        for (const catalogue of imports) {
          const found = catalogue[key];
          const system = catalogue.isGameSystem();
          if (found && Array.isArray(found)) {
            for (const child of found) {
              if (!this.filter_child(child as EditorBase)) continue;
              if (!system && (child as EditorBase).import === false) continue;
              output.push({ item: child as ItemTypes & EditorBase, type, imported: true });
            }
          }
        }
      }
    },
    allowed(child: string | string[]) {
      if (Array.isArray(child)) {
        for (const type of child) {
          if (this.allowedChildren.has(type)) return true;
        }
        return false;
      }
      return this.allowedChildren.has(child);
    },
    filter_child(elt: EditorBase) {
      if (!this.forceShow) {
        if (this.store.filter && elt.showInEditor !== true) return false;
      }
      return true;
    },

    sorted(items: CatalogueEntryItem[]) {
      if (!this.sortable(this.item)) {
        return sortByDescending(items, (o) => order[o.item.editorTypeName] || 1000);
      }
      switch (this.settings.sort) {
        default:
        case "asc":
          const asc = sortByAscending(items, (o) => o.item.getName() || "");
          return sortByDescending(asc, (o) => order[o.item.editorTypeName] || 1000);
        case "desc":
          const desc = sortByDescending(items, (o) => o.item.getName() || "");
          return sortByDescending(desc, (o) => order[o.item.editorTypeName] || 1000);
        case "type":
          const type = sortByAscending(items, (o) => {
            return (o.item.isProfile() ? o.item.getTypeName() : o.item.getType()) || "";
          });
          return sortByDescending(type, (o) => order[o.item.editorTypeName] || 1000);
      }
    },

    menu(ref: string) {
      return {
        show: (event: MouseEvent, e: any) => {
          this.contextmenuopen = true;
          this.$nextTick(() => {
            (this.$refs[ref] as any)?.show(event, e);
          });
        },
        close: (event: MouseEvent, e: any) => {
          (this.$refs[ref] as any)?.se(event, e);
          this.contextmenuopen = false;
        },
      };
    },
    get_field(field: string) {
      return (this.item as any)[field];
    },
    get_target_field(field: string) {
      if (this.item.target) {
        return (this.item.target as any)[field];
      }
    },
    hideType(type: string) {
      if (type === "categoryLinks" && !this.item.isForce()) return true;
      if (hiddenTypes.has(type)) return true;
    },
  },

  computed: {
    // primary() {
    //   let result = "";
    //   for (const cl of this.item.categoryLinksIterator()) {
    //     if (cl.primary) {
    //       result = cl.target.name;
    //     }
    //   }
    //   return result ? result + " " : result;
    // },
    costs() {
      const result = [] as ICost[];
      const catalogue = this.item.getCatalogue();
      const costs = this.item.getCosts();
      for (const cost of costs) {
        const name = catalogue.findOptionById(cost.typeId)?.name || cost.name || cost.typeId;
        if (name) {
          result.push({
            name: name,
            value: cost.value,
            typeId: cost.typeId,
          });
        }
      }
      return formatCosts(result);
    },
    link(): Link & EditorBase {
      return this.item as Link & EditorBase;
    },
    iscollapsible() {
      return this.mixedChildren.length > 0;
    },
    contextmenu() {
      return this.menu("contextmenu");
    },
    nestedcontextmenu() {
      return this.menu("nestedcontextmenu");
    },
    catalogue() {
      return this.item.getCatalogue() as Catalogue & EditorBase;
    },
    catalogues() {
      return this.catalogue.imports;
    },

    allowedChildren() {
      return allowed_children(this.item, this.item.parentKey);
    },
    forceShow() {
      return this.item.showChildsInEditor || this.forceShowRecursive;
    },

    mixedChildren(): Array<CatalogueEntryItem> {
      const childs = [];
      for (const category of this.allowedChildren) {
        if (this.hideType(category)) continue;

        const arr = this.get_field(category);
        if (arr?.length) {
          for (const elt of arr) {
            if (!this.filter_child(elt)) continue;
            childs.push({ type: category as ItemKeys, item: elt });
          }
        }
      }

      if (this.item.isLink() && this.item.target) {
        const targetChilds = [];
        for (const category of this.allowedChildren) {
          if (this.hideType(category)) continue;

          const target_arr = this.get_target_field(category);
          if (target_arr?.length) {
            for (const elt of target_arr) {
              if (!this.filter_child(elt)) continue;
              targetChilds.push({ type: category as ItemKeys, item: elt, imported: true });
            }
          }
        }
        return [...this.sorted(targetChilds), ...this.sorted(childs)];
      }
      return this.sorted(childs);
    },
    categories() {
      if (this.item.isCatalogue()) {
        const categories = this.item.isGameSystem() ? systemCategories : catalogueCategories;
        return categories;
      }
      return [];
    },
    groupedCategories() {
      return this.categories.map((category) => {
        const items = [] as CatalogueEntryItem[];
        if (category.type) this.getTypedArray(this.item as any, category.type, items);
        if (category.links) this.getTypedArray(this.item as any, category.links, items);
        return {
          ...category,
          items: this.sorted(items),
        };
      });
    },
  },
};
</script>

<style scoped lang="scss">
@import "@/shared_components/css/vars.scss";
.imported {
  color: rgb(128, 145, 183);
  // font-style: italic;
}
.filtered {
  background-color: rgba(10, 80, 255, 0.15);
}
.typeIcon {
  max-width: 18px;
}
.typeIcon-wrapper {
  display: inline-block;
  min-width: 20px;
  min-height: 1px;
}

.head {
  margin-left: -20px;
}

.text-orange {
  color: rgb(153 31 31);
}
</style>
