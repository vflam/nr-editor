export const entries = {
  catalogueLinks: {
    allowedChildrens: [],
  },
  publications: {
    allowedChildrens: [],
  },
  costTypes: {
    allowedChildrens: [],
  },
  profileTypes: {
    allowedChildrens: [],
  },
  categoryEntries: {
    allowedChildrens: ["profiles", "rules", "infoGroups", "infoLinks", "constraints", "modifiers", "modifierGroups"],
  },
  categoryLinks: {
    allowedChildrens: ["profiles", "rules", "infoGroups", "infoLinks", "constraints", "modifiers", "modifierGroups"],
  },
  forceEntries: {
    allowedChildrens: [
      "forceEntries",
      "categoryLinks",
      "profiles",
      "rules",
      "infoGroups",
      "infoLinks",
      "constraints",
      "modifiers",
      "modifierGroups",
    ],
  },
  entryLinks: {
    allowedChildrens: "type",
  },
  selectionEntryGroups: {
    allowedChildrens: [
      "selectionEntries",
      "selectionEntryGroups",
      "entryLinks",
      "profiles",
      "rules",
      "infoGroups",
      "infoLinks",
      "constraints",
      "modifiers",
      "modifierGroups",
    ],
  },
  sharedSelectionEntryGroups: {
    allowedChildrens: [
      "selectionEntries",
      "selectionEntryGroups",
      "entryLinks",
      "profiles",
      "rules",
      "infoGroups",
      "infoLinks",
      "constraints",
      "modifiers",
      "modifierGroups",
    ],
  },
  selectionEntries: {
    allowedChildrens: [
      "selectionEntries",
      "selectionEntryGroups",
      "entryLinks",
      "profiles",
      "rules",
      "infoGroups",
      "infoLinks",
      "associations",
      "constraints",
      "modifiers",
      "modifierGroups",
    ],
  },
  sharedSelectionEntries: {
    allowedChildrens: [
      "selectionEntries",
      "selectionEntryGroups",
      "entryLinks",
      "profiles",
      "rules",
      "infoGroups",
      "infoLinks",
      "associations",
      "constraints",
      "modifiers",
      "modifierGroups",
    ],
  },
  associations: {
    allowedChildrens: ["constraints", "modifiers", "modifierGroups"],
  },
  sharedRules: {
    allowedChildrens: ["modifiers", "modifierGroups", "infoLinks"],
  },
  rules: {
    allowedChildrens: ["modifiers", "modifierGroups", "infoLinks"],
  },
  profiles: {
    allowedChildrens: ["modifiers", "modifierGroups"],
  },
  sharedProfiles: {
    allowedChildrens: ["modifiers", "modifierGroups"],
  },
  infoGroups: {
    allowedChildrens: ["profiles", "rules", "infoGroups", "infoLinks", "modifiers", "modifierGroups"],
  },
  infoLinks: {
    allowedChildrens: "type", //get from type
  },
  modifiers: {
    allowedChildrens: ["conditions", "conditionGroups", "repeats"],
  },
  modifierGroups: {
    allowedChildrens: ["modifiers", "modifierGroups", "conditions", "conditionGroups", "repeats"],
  },
  conditions: {
    allowedChildrens: [],
  },
  conditionGroups: {
    allowedChildrens: ["conditions", "conditionGroups"],
  },
  catalogue: {
    allowedChildrens: [
      "categoryLinks",
      "publications",
      "costTypes",
      "profileTypes",
      "categoryEntries",
      "forceEntries",
      "sharedSelectionEntries",
      "sharedSelectionEntryGroups",
      "sharedProfiles",
      "sharedRules",
      "sharedInfoGroups",
      "selectionEntries",
      "rules",
    ],
  },

  gameSystem: {
    allowedChildrens: [
      "publications",
      "costTypes",
      "profileTypes",
      "categoryEntries",
      "forceEntries",
      "sharedSelectionEntries",
      "sharedSelectionEntryGroups",
      "sharedProfiles",
      "sharedRules",
      "sharedInfoGroups",
      "selectionEntries",
      "rules",
    ],
  },
};
