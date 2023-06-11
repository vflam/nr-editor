import { getModifierOrConditionParent } from "~/assets/shared/battlescribe/bs_editor";
import { Catalogue, EditorBase } from "~/assets/shared/battlescribe/bs_main_catalogue";
import { BSICondition } from "~/assets/shared/battlescribe/bs_types";

export interface EditorSearchItem {
  id: string;
  name: string;
  editorTypeName: string;
  indent: number;
  catalogue: string | null;
  shared: boolean;
}

function recursive(current: Catalogue | EditorBase, iterator: string, result: EditorSearchItem[], indent = 0) {
  for (const child of (current as any)[iterator]()) {
    result.push({
      name: child.name,
      editorTypeName: child.editorTypeName,
      id: child.id,
      indent: indent,
      catalogue: child.catalogue.getName(),
      shared: getFirstAncestor(child)?.parentKey?.includes("shared") || false,
    });
    recursive(child, iterator, result, indent + 1);
  }
}

function recursiveWithFilter(
  current: Catalogue | EditorBase,
  iterator: string,
  cb: (current: EditorBase) => unknown,
  result: EditorSearchItem[],
  indent = 0
) {
  for (const child of (current as any)[iterator]()) {
    result.push({
      name: child.name,
      editorTypeName: child.editorTypeName,
      id: child.id,
      indent: indent,
      catalogue: child.catalogue.getName(),
      shared: getFirstAncestor(child)?.parentKey?.includes("shared") || false,
    });
    recursive(child, iterator, result, indent + 1);
  }
}

export function getSearchElements(
  catalogue: Catalogue | EditorBase,
  type: keyof Catalogue | EditorBase
): EditorSearchItem[] {
  let res: EditorSearchItem[] = [];
  recursive(catalogue, type as string, res);
  return res;
}

export function getSearchSelections(
  catalogue: Catalogue | EditorBase,
  includeRootSelectionEntries: boolean
): EditorSearchItem[] {
  const res: EditorSearchItem[] = [];
  const iterator = includeRootSelectionEntries ? "iterateSelectionEntriesWithRoot" : "iterateSelectionEntries";
  recursive(catalogue, iterator, res);
  return res;
}

export function getSearchSelectionsWithCategory(
  item: EditorBase,
  catalogue: Catalogue | EditorBase
): EditorSearchItem[] {
  const res: EditorSearchItem[] = [];
  const primary = item.getPrimaryCategory();
  recursiveWithFilter(
    catalogue,
    "iterateAllRootEntries",
    (o) => getFirstAncestor(o).getPrimaryCategory() === primary,
    res
  );
  return res;
}

export function getSearchCategories(catalogue: Catalogue): EditorSearchItem[] {
  const res: EditorSearchItem[] = [];
  for (let elt of catalogue.iterateCategoryEntries()) {
    const current = elt as any;
    if (current.isCatalogue()) {
      continue;
    }
    res.push({
      name: current.name,
      editorTypeName: current.editorTypeName,
      id: current.id,
      indent: 1,
      catalogue: current.catalogue.getName(),
      shared: getFirstAncestor(current)?.parentKey?.includes("shared") || false,
    });
  }
  return res;
}

export function itemDepth(item: EditorBase): number {
  let res = 0;
  let parent: EditorBase | null = getModifierOrConditionParent(item);
  while (parent) {
    res++;
    parent = parent.parent || null;
  }
  return res;
}

export function getParentUnitHierarchy(item: EditorBase): EditorSearchItem[] {
  let res: EditorSearchItem[] = [];
  let parent: EditorBase | null = item;
  let i = 1;
  const rootDepth = itemDepth(item) - 1;
  parent = getModifierOrConditionParent(item);
  while (parent != null && !parent.isCatalogue()) {
    if (parent.editorTypeName === "selectionEntry") {
      res.push({
        name: parent.name,
        id: parent.id,
        editorTypeName: parent.editorTypeName,
        indent: i,
        catalogue: parent.catalogue.getName(),
        shared: getFirstAncestor(parent)?.parentKey?.includes("shared") || false,
      });
      i++;
    }
    parent = parent.parent || null;
  }
  res = res.reverse();
  res.forEach((elt, ind) => {
    elt.indent = ind + rootDepth;
  });
  return res;
}

export function getParentSelections(item: EditorBase): EditorSearchItem[] {
  const parentElements = getSearchElements(item, "iterateRootEntries");
  parentElements.splice(0, 1);
  return parentElements;
}

export function scopeIsId(item: BSICondition) {
  return (
    ["self", "parent", "ancestor", "primary-category", "primary-catalogue", "force", "roster"].includes(item.scope) ==
    false
  );
}

export function getFirstAncestor(item: EditorBase): EditorBase {
  let parent = item;
  while (
    parent.parent != null &&
    parent.parent.editorTypeName != "gameSystem" &&
    parent.parent.editorTypeName != "catalogue"
  ) {
    parent = parent.parent;
  }
  return parent;
}

export function getFilterSelections(item: BSICondition & EditorBase, catalogue: Catalogue): EditorSearchItem[] {
  const includeAllRootEntries = ["primary-catalogue", "roster", "force"];
  if (includeAllRootEntries.includes(item.scope)) {
    return getSearchSelections(catalogue, true);
  }

  const res = getSearchSelections(catalogue, false);
  if (item.scope == "self") {
    const parent: EditorBase | null = getModifierOrConditionParent(item);
    return res.concat(getParentSelections(parent));
  }

  if (item.scope == "ancestor") {
    const parent: EditorBase | null = getModifierOrConditionParent(item);
    return res;
  }

  if (item.scope == "parent") {
    // It looks like first level elements of shared entries and groups consider the Roster as their parent
    if (getFirstAncestor(item).parentKey.includes("shared")) {
      return getSearchSelections(catalogue, true);
    }

    let parent: EditorBase | null = getModifierOrConditionParent(item);
    if (parent.parent) {
      parent = parent.parent;
    }
    return res.concat(getParentSelections(parent));
  }

  if (item.scope == "primary-category") {
    return getSearchSelectionsWithCategory(getFirstAncestor(item), catalogue);
  }

  const parent = catalogue.findOptionById(item.scope) as EditorBase;
  if (parent) {
    return res.concat(getParentSelections(parent));
  }
  return res;
}

export function getFilterForces(item: EditorBase, catalogue: Catalogue, scope: string): EditorSearchItem[] {
  return [];
}
