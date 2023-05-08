<template>
  <div class="box">
    <CatalogueRightPanelPublicationPanel
      v-if="item.type == 'publications'"
      :item="item.item"
      @catalogueChanged="changed"
    />

    <CatalogueRightPanelCostTypesPanel
      v-if="item.type == 'costTypes'"
      :item="item.item"
      @catalogueChanged="changed"
    >
    </CatalogueRightPanelCostTypesPanel>

    <CatalogueRightPanelProfileTypesPanel
      v-if="item.type == 'profileTypes'"
      :item="item.item"
      @catalogueChanged="changed"
    >
    </CatalogueRightPanelProfileTypesPanel>

    <CatalogueRightPanelSharedProfilesPanel
      v-if="item.type == 'sharedProfiles'"
      :item="item.item"
      @catalogueChanged="changed"
    >
    </CatalogueRightPanelSharedProfilesPanel>
  </div>
</template>

<script lang="ts">
import { PropType } from "nuxt/dist/app/compat/capi";
import { Catalogue } from "~/assets/shared/battlescribe/bs_main_catalogue";

export default {
  emits: ["catalogueChanged"],
  props: {
    catalogue: {
      type: Object as PropType<Catalogue>,
      required: true,
    },
    item: {
      type: Object as PropType<{ type: string; item: any }>,
      required: true,
    },
  },

  methods: {
    changed() {
      this.$emit("catalogueChanged");
    },
  },
};
</script>

<style lang="scss">
.editorTable {
  width: 100%;
  td {
    border: none;
    text-align: left;
    &:first-child {
      width: 200px;
      text-align: right;
    }
  }

  select,
  input[type="text"] {
    width: 100% !important;
  }
}
</style>