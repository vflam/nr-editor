import type { Catalogue, EditorBase } from "~/assets/shared/battlescribe/bs_main_catalogue";
import type { BSIConstraint, BSICost, BSIEntryLink, BSIInfoGroup, BSIInfoLink, BSIModifier, BSIProfile, BSISelectionEntry, BSISelectionEntryGroup } from "~/assets/shared/battlescribe/bs_types";
import type { EntyTemplate, Equipment, NoId, Page, ParsedUnitText, Profile, SpecialRule, Unit, Weapon } from "./import_types"
import { hashFnv32a, isSameCharacteristics, removeTextInParentheses, splitAnd, splitByCenterDot, removeSuffix, replaceNewlineWithSpace, getOnlyTextInParentheses, extractTextAndDetails, replaceSuffix } from "./import_helpers"
import { getGroup, parseDetails, toCost, toEntry, toEntryLink, toEquipment, toGroup, toGroupLink, toInfoLink, toMaxConstraint, toMinConstraint, toModelProfile, toProfileLink, toSpecialRule, toSpecialRuleLink, toUnitProfile, toWeaponProfile } from "./import_create_entries";
import { sortByAscending } from "~/assets/shared/battlescribe/bs_helpers";
import { optionsToGroups } from "./import_options";

function cmpItems(a: string, b: string) {
    return a.toLowerCase().replace(/s/g, "") === b.toLowerCase().replace(/s/g, "")
}
function findProfile(cat: Catalogue & EditorBase, profile: NoId<BSIProfile>) {
    if (profile.comment) {
        return cat.sharedProfiles?.find(o => o.comment === profile.comment && o.typeName === profile.typeName)
    }
    return cat.sharedProfiles?.find(o => o.name === profile.name && o.typeName === profile.typeName)
}
function findImportedProfile(cat: Catalogue & EditorBase, profileName: string, typeName: string) {
    if (!profileName) return
    const lower = profileName.trim().toLowerCase()
    for (const imported of [cat, ...cat.imports]) {
        for (const profile of imported.sharedProfiles || []) {
            if (!profile.getName()) continue;
            const found = removeSuffix(profile.getName().trim().toLowerCase(), " (x)")
            if (lower === found && profile.typeName === typeName) {
                return profile
            }
        }
        // for (const profile of imported.sharedProfiles || []) {
        //     const found = profileName.trim().toLowerCase()
        //     if (found.includes(lower) && profile.typeName === typeName) {
        //         return profile
        //     }
        // }
    }
}
function findImportedEntry(cat: Catalogue & EditorBase, entryName: string, type: string) {
    const lower = removeSuffix(entryName.trim().toLowerCase(), "s")
    if (!lower) return;
    for (const imported of [cat, ...cat.imports]) {
        for (const entry of imported.sharedSelectionEntries || []) {
            if (entry.getType() !== type) continue;
            if (entry.name.trim().toLowerCase() === lower) {
                return entry
            }
        }
        for (const entry of imported.sharedSelectionEntries || []) {
            if (entry.getType() !== type) continue;
            if (entry.name.trim().toLowerCase().includes(lower)) {
                return entry
            }
        }
    }
}
function findSharedEntries(cat: Catalogue & EditorBase, entryName: string, type: string) {
    const lower = removeSuffix(entryName.trim().toLowerCase(), "s")
    const result = [];
    if (!lower) return result;
    for (const entry of cat.sharedSelectionEntries || []) {
        if (entry.getType() !== type) continue;
        if (removeSuffix(entry.name.trim().toLowerCase(), "s") === lower) {
            result.push(entry)
        }
    }
    return result;
}
function findUnitProfile(cat: Catalogue & EditorBase, unitName: string, profileName: string, typeName: string) {
    const fullComment = `${unitName}/${profileName}`
    return cat.sharedProfiles?.find(o => o.comment === fullComment && o.typeName === typeName) ?? cat.sharedProfiles?.find(o => o.name === profileName && o.typeName === typeName)
}

function findUnit(cat: Catalogue & EditorBase, name: string) {
    return cat.sharedSelectionEntries?.find(o => o.name === name && o.getType() === "unit")
}
function findRootUnit(cat: Catalogue & EditorBase, name: string) {
    return cat.entryLinks?.find(o => o.name === name && o.getType() === "unit")
}

function parseSpecialRule(rule: string) {
    const pattern = /^([^(]+?)([*]*)(?:\s*[(]([^)]+)[)])?([*]*)$/;
    const match = rule.match(pattern);
    if (!match) {
        console.warn("Couldn't parse rule " + rule);
        return {}
    }
    let ruleName = match[1].trim();
    let param = null;
    let specification = null;
    let asterisks = match[2].length + match[4].length
    if (match[3]) {
        const pieces = match[3].split(", ")
        param = pieces[0]
        if (pieces.length === 1) {
            specification = pieces[1]
        }
        if (pieces.length > 2) {
            console.log(`${rule} has more text within parentheses that is not handled.`)
        }
    }

    ruleName = ruleName.replace("\u0007 ", "");
    ruleName = ruleName.replace("\u0007", "");
    if (ruleName.startsWith('Poisoned Attacks') && ruleName.includes('*Note')) {
        ruleName = "Poisoned Attacks"
    }
    return { ruleName, param, specification, asterisks };
}
function splitSpecialRules(str: string) {
    let result = [];
    let start = 0;
    let level = 0; // To keep track of parentheses depth
    for (let i = 0; i < str.length; i++) {
        // Increase level when an opening parenthesis is found
        if (str[i] === '(') {
            level++;
        }
        // Decrease level when a closing parenthesis is found
        else if (str[i] === ')') {
            level--;
        }
        // Check for ", " outside of parentheses
        else if (str.substring(i, i + 2) === ", " && level === 0) {
            // Add the substring to the result array
            result.push(str.substring(start, i));
            // Move the start to after the ", "
            start = i + 2;
            // Skip the next character as we already know it's a space
            i++;
        }
    }
    // Add the last part of the string
    result.push(str.substring(start));

    return result;
}
function getSpecialRules(cat: Catalogue & EditorBase, name: string, unit: Unit, model?: string) {
    const hash = model ? `${name}/${model}` : name;
    const group: BSIInfoGroup = {
        infoLinks: [],
        name: "Special Rules",
        hidden: false,
        id: hashFnv32a(`${hash}/specialRules`),
    }
    if (unit["Subheadings"]['Special Rules:']) {
        const found = parseUnitField(unit["Subheadings"]['Special Rules:'])
        const selected = model ? getSpecific(found, model) : found.all
        if (selected) {
            for (const rule of splitSpecialRules(selected)) {
                const { ruleName, param } = parseSpecialRule(rule);
                const profile = findImportedProfile(cat, ruleName!, "Special Rule")
                if (!profile) {
                    console.log(`[SPECIAL RULES] Couldn't find Special Rule from ${hash}: ${ruleName}`)
                    continue;
                }
                group.infoLinks!.push(toSpecialRuleLink(rule, hash, profile.id, param))
            }
        }

    }
    if (!model && unit["Subheadings"]['Armour Value:']) {
        group.infoLinks!.push(getArmourValueProfile(cat, name, unit["Subheadings"]['Armour Value:']))
    }
    return group;
}
function getArmourValueProfile(cat: Catalogue & EditorBase, name: string, armourValue: string) {
    const armourProfile = findImportedProfile(cat, "Armour Value", "Armour")!
    const result: BSIInfoLink = {
        name: "Armour Value",
        hidden: false,
        id: hashFnv32a(`${name}/armourValue`),
        type: "profile",
        targetId: armourProfile.id,
        modifiers: [{ type: "append", value: `: ${armourValue}`, field: "name" }]
    }
    return result;
}


function cmpModel(a: string, b: string) {
    a = a.toLowerCase()
    a = a.replace(/ie$/, "y")
    a = a.replace(/men$/, "man")
    a = a.replace(/s/, "")
    b = b.toLowerCase()
    b = b.replace(/ie$/, "y")
    b = b.replace(/men$/, "man")
    b = b.replace(/s/, "")
    return a === b
}
function cmpModel2(a: string, b: string) {
    a = a.toLowerCase()
    a = a.replace(/ie$/, "y")
    a = a.replace(/men$/, "man")
    a = a.replace(/s/, "")
    b = b.toLowerCase()
    b = b.replace(/ie$/, "y")
    b = b.replace(/men$/, "man")
    b = b.replace(/s/, "")
    return a.includes(b) || b.includes(a)
}
function getSpecific(parsedField: ReturnType<typeof parseUnitField>, model: string) {
    const initialModel = model;
    if (parsedField[model]) {
        if (parsedField[model]) {
            return parsedField[model]
        }
        model = model.replace(/ie$/, "y")
        model = model.replace(/men$/, "man")
        if (parsedField[model]) {
            return parsedField[model]
        }

    } else {
        const noS = initialModel.replace(/s/g, "")
        for (const key in parsedField) {
            const keyNoS = key.replace(/s/g, "")
            if (key !== "all" && (keyNoS.includes(noS) || noS.includes(keyNoS))) {
                return parsedField[key]
            }
        }
    }
}
function getEquipment(cat: Catalogue & EditorBase, name: string, profileName: string, unit: Unit) {
    const result = [] as BSIEntryLink[];
    const equipmentText = unit.Subheadings["Equipment:"];
    if (equipmentText) {
        const rawEquipment = parseUnitField(equipmentText);
        const foundEquipment = [] as Equipment[]
        if (rawEquipment.all) {
            foundEquipment.push(...parseEquipment(rawEquipment.all))
        }
        const specific = getSpecific(rawEquipment, profileName)
        if (specific) {
            foundEquipment.push(...parseEquipment(specific))
        }


        for (const equipment of foundEquipment) {
            for (const item of splitAnd(equipment.text)) {
                let target = findImportedEntry(cat, item, "upgrade")
                if (!target) {
                    if (!equipment.details) {
                        console.log(`[EQUIPMENT] Couldn't find Entry ${item}`)
                    } else continue;
                }
                result.push(toEquipment(item, `${name}/${profileName}`, target?.id ?? item))
            }
            if (!equipment.details) continue;
            for (const item of splitAnd(equipment.details)) {
                let target = findImportedEntry(cat, item, "upgrade")
                if (!target) {
                    console.log(`[EQUIPMENT] Couldn't find Entry(${item}) From: ${equipment.text}/${equipment.details} ${item}`)
                }
                result.push(toEquipment(target?.name ?? item, `${name}/${profileName}`, target?.id ?? item))
            }
        }
    }
    return result;
}
function getModelEntry(cat: Catalogue & EditorBase, name: string, profile: Profile, unit: Unit) {
    const profileName = profile.Name
    const sharedProfile = findUnitProfile(cat, name, profileName, "Model")
    if (!sharedProfile) {
        console.error(`Couldn't find shared profile for ${name}/${profileName}`)
        return;
    }
    const cost = profile.Stats.Points === "-" ? 0 : Number(profile.Stats.Points)
    if (isNaN(cost)) {
        console.log(`[MODEL] got a NaN cost in ${name}/${profileName}`)
    }
    const model: BSISelectionEntry = {
        type: "model",
        subType: profileName.includes('Crew') ? "crew" : undefined,
        name: profileName,
        id: hashFnv32a(`${name}/model/${profileName}`),
        hidden: false,
        infoLinks: [
            {
                name: profileName,
                hidden: false,
                type: "profile",
                id: hashFnv32a(`${name}/model/${profileName}/profile`),
                targetId: sharedProfile.id
            },
        ],
        costs: [{ name: "pts", typeId: "points", value: cost }],
        entryLinks: [],
        infoGroups: [],
        profiles: [] as BSIProfile[],
        selectionEntries: [] as BSISelectionEntry[],
        selectionEntryGroups: [] as BSISelectionEntryGroup[],
        constraints: [] as BSIConstraint[],
    }

    const baseSizes = unit["Subheadings"]["Base Size:"]?.split(', ') || []
    const base = getBase(cat, baseSizes, profile);
    if (base) {
        model.infoLinks!.push({
            name: "Base",
            hidden: false,
            type: "profile",
            id: hashFnv32a(`${name}/${profileName}/base`),
            targetId: base.id,
            modifiers: [{ type: "set", value: "Base", field: "name" }]
        })
    } else {
        const error = `[BASE] Couldn't get Base`;
        model.entryLinks!.push(toEntryLink(error, `${model.name}/bug/base`, error))
    }
    const equipment = getEquipment(cat, name, profileName, unit);
    if (equipment.length) {
        model.entryLinks!.push(...equipment)
    }

    const specialRules = getSpecialRules(cat, name, unit, profileName)
    if (specialRules.infoLinks!.length) {
        model.infoGroups!.push(specialRules)
    }

    return model;
}
function getConstraints(cat: Catalogue & EditorBase, parentName: string, unitSize: string): BSIConstraint[] {
    function getMin(min: string | number) {
        return {
            type: "min",
            value: min,
            field: "selections",
            scope: "parent",
            shared: true,
            id: hashFnv32a(`${parentName}/min`)
        } as BSIConstraint;
    }
    function getMax(max: string | number) {
        return {
            type: "max",
            value: max,
            field: "selections",
            scope: "parent",
            shared: true,
            id: hashFnv32a(`${parentName}/max`)
        } as BSIConstraint;
    }
    const result = [
        getMin(parseInt(unitSize))
    ];
    const minMax = unitSize.match(/([0-9]+)[-]([0-9]+)/)
    if (minMax) {
        result.push(getMax(minMax[2]))
    }
    else if (!unitSize.endsWith("+")) {
        result.push(getMax(parseInt(unitSize)))
    }
    return result;
}

function getBase(cat: Catalogue & EditorBase, baseSizes: string[], profile: Profile) {
    function extractSize(text: string) {
        const pattern = /(\d+)\s*x\s*(\d+)/i;
        const match = text.match(pattern);
        if (match) {
            return `${match[1]}x${match[2]}`;
        }
        return null;
    };
    if (baseSizes.length) {
        let baseSizeString = baseSizes[0]
        if (profile.Name.toLowerCase().includes('Crew')) {
            baseSizeString = baseSizes.find(o => o.includes('crew')) ?? baseSizes[0]
        }
        if (baseSizeString === "N/A") return null;
        const found = findImportedProfile(cat, `Base (${extractSize(baseSizeString)})`, "Base")
        return found;
    }
}







function updateProfile(cat: Catalogue & EditorBase, profile: NoId<BSIProfile>) {
    const existing = findProfile(cat, profile)
    if (existing) {
        if (!isSameCharacteristics(existing.characteristics, profile.characteristics)) {
            existing.characteristics = profile.characteristics;
        }
        return existing;
    } else {
        return $store.add_child("sharedProfiles", cat, profile)
    }
}
function updateSharedProfiles(cat: Catalogue & EditorBase, pages: Page[]) {
    const counts = {} as Record<string, number>
    for (const page of pages) {
        for (const unit of page.Units || []) {
            for (const profile of unit.Profiles || []) {
                profile.Name = profile.Name.trim()
                counts[profile.Name] = (counts[profile.Name] || 0) + 1;
            }
        }
    }
    for (const page of pages) {
        for (const unit of page.Units || []) {
            for (const profile of unit.Profiles || []) {
                const hasDuplicateWithSameName = counts[profile.Name] > 1
                const parsed = hasDuplicateWithSameName ? toModelProfile(profile, unit.Name) : toModelProfile(profile)
                updateProfile(cat, parsed)
            }
        }
    }
}
function updateSpecialRules(cat: Catalogue & EditorBase, pages: Page[]) {
    for (const page of pages) {
        for (const [name, desc] of Object.entries(page["Special Rules"] || {})) {
            if (desc) {
                const rule = toSpecialRule(removeSuffix(name, " (X)"), desc)
                updateProfile(cat, rule)
            }
        }
        for (const [name, description] of Object.entries(page["Special Rules"] || {})) {
            if (description) {
                const rule = toSpecialRule(removeSuffix(name, " (X)"), description)
                updateProfile(cat, rule)
            }
        }

    }
}
function updateWeapons(cat: Catalogue & EditorBase, pages: Page[]) {
    for (const page of pages) {
        for (const wep of page.Weapons || []) {
            const found = findImportedEntry(cat, wep.Name, "upgrade")
            const profile = toWeaponProfile(wep.Name, wep)
            let create = false;
            if (!found?.profiles?.length) {
                create = true;
            }
            if (found?.profiles?.length && !isSameCharacteristics(found.profiles[0].characteristics, profile.characteristics)) {
                create = true;
            }
            if (create) {
                findSharedEntries(cat, wep.Name, "upgrade").map(o => $store.del_child(o))
                const sharedProfile = updateProfile(cat, profile)
                $store.add_child("sharedSelectionEntries", cat, {
                    name: sharedProfile.name,
                    id: hashFnv32a(`${cat.name}/weapon/${wep.Name}`),
                    hidden: false,
                    import: true,
                    type: "upgrade",
                    infoLinks: [toInfoLink(wep.Name, sharedProfile)]
                })
            } else {

            }
        }
    }
}

function parseUnitField(field: string) {
    const clean = field.replace(/([\n]|\s)+/g, " ");
    return splitByCenterDot(clean);
}
function removePrefix(from: string, prefix: string): string {
    if (from.startsWith(prefix)) {
        return from.substring(prefix.length);
    }
    return from;
}
function parseEquipment(field: string): Equipment[] {
    const parsed = extractTextAndDetails(field)
    for (const found of parsed) {
        if (found.details === null) { continue; };
        if (found.details.includes("see below")) { found.details = null; continue; };
        if (found.details.includes("see page")) { found.details = null; continue; };
        if (found.details.startsWith('counts as ')) {
            found.details = removePrefix(found.details, 'counts as ')
        }
    }
    return parsed;
}

function commonGroups(what: string, token?: string) {
    what = what.toLowerCase()
    switch (what) {
        case "magic items":
            return "Magic Items"
        case "magic standard":
            return "Magic Standard"
        case "daemonic icon":
            return "Daemonic Icon"
        case "daemonic gifts":
            return "Daemonic Gifts"
        case "vampiric Powers":
            return "Vampiric Powers"
        default:
            if (what.includes("special rule") || token?.includes("special rule")) {
                return "Special Rules"
            }
            if (what.includes("level")) {
                return "Wizard Level"
            }
            if (what.includes("mount") || token?.includes("mount")) {
                return "Mount"
            }
            if (what.includes("daemon") && what.includes("of")) {
                return "Special Rules"
            }
            return "Equipment"

    }
}
function findModel(models: BSISelectionEntry[], model: string) {
    const foundModel = models.find(o => cmpModel(o.name, model)) ?? models.find(o => cmpModel2(o.name, model))
    return foundModel
}
function findModels(models: BSISelectionEntry[], model: string) {
    const foundModel = models.filter(o => cmpModel(o.name, model)) ?? models.filter(o => cmpModel2(o.name, model))
    return foundModel
}
function createUnit(cat: Catalogue & EditorBase, unit: Unit) {
    const unitName = unit.Name
    const existing = findUnit(cat, unitName)
    if (existing) {
        $store.del_child(existing);
    }
    const entry = {
        type: "unit",
        import: true,
        name: unitName,
        hidden: false,
        profiles: [] as BSIProfile[],
        selectionEntries: [] as BSISelectionEntry[],
        selectionEntryGroups: [] as BSISelectionEntryGroup[],
        infoGroups: [] as BSIInfoGroup[],
        entryLinks: [] as BSIEntryLink[],
        costs: [] as BSICost[],
        constraints: [] as BSIConstraint[],
        id: hashFnv32a(`${unitName}/unit`)
    } satisfies BSISelectionEntry;
    if (existing?.id) entry.id = existing.id;

    if (unit['Points']) {
        const unitCost = parseInt(unit['Points'])
        if (isNaN(unitCost)) {
            console.log(`[UNIT] got a NaN cost in Unit ${unitName}`)
        }
        entry.costs.push({ name: "pts", typeId: "points", value: unitCost });
    }

    const group = getSpecialRules(cat, unitName, unit)
    if (group.infoLinks!.length) {
        entry.infoGroups!.push(group)
    }


    const unitProfile = toUnitProfile(unitName, unit)
    if (unitProfile) {
        entry.profiles!.push(unitProfile);
    }

    if (!unit.Profiles.length) {
        console.log(`[UNIT] ${unitName} has no profiles`)
        return;
    }

    const modelEntries = [] as BSISelectionEntry[]
    for (const profile of unit.Profiles || []) {
        const modelEntry = getModelEntry(cat, unitName, profile, unit)
        if (modelEntry) {
            entry.selectionEntries.push(modelEntry);
            modelEntries.push(modelEntry)
        }
    }

    if (unit.Subheadings["Unit Size:"]) {
        const firstEntry = entry.selectionEntries![0];
        const unitSize = unit.Subheadings["Unit Size:"].trim()
        if (!unitSize.match('^[0-9]+[+]?$') && !unitSize.match(/([0-9])+[-]([0-9])+/)) {
            // console.warn(`[UNIT SIZE] Unparsed value in ${unitName}:`, unitSize);
            const error = `[UNIT SIZE] Unparsed value: ${unitSize}`
            entry.entryLinks!.push(toEntryLink(error, `${unitName}/bug`, error))
        }
        const constraints = getConstraints(cat, `${unitName}/${firstEntry.name}`, unitSize)
        firstEntry.constraints = constraints
    } else {
        console.log(`[UNIT] ${unitName} has no Unit Size`)
    }

    if (unit.Subheadings["Troop Type:"]) {
        if (unit.Subheadings["Troop Type:"].toLowerCase().includes('character')) {
            const model = modelEntries[0]
            const GENERAL_ID = "7d76-b1a1-1535-a04c"
            getGroup(model, "Command", unitName).entryLinks!.push(toEntryLink("General", `${unitName}/${model.name}`, GENERAL_ID));
        }
    }


    const loresToAdd = []
    if (unit.Subheadings["Magic:"]) {
        const magicText = unit.Subheadings["Magic:"]
        const knowsFrom = magicText.split('\n').map(o => o.trim()).filter(o => o.startsWith("•")).map(o => removePrefix(o, "• "))
        const otherText = magicText.split('\n').filter(o => !o.includes("•")).map(o => o.trim()).join(" ");

        for (const line of otherText.split('.').map(o => o.trim())) {
            if (line.includes("knows")) {
                "A Warlock Engineer that is a Wizard knows spells from one of the following Lores of Magic:"
                "Every Grey Seer knows spells from one of the following Lores of Magic:"
                const match = line.match(/^(?:A|Every) (.*?) (?:that is a Wizard knows spells|knows spells|knows a spell) from(?: the)? (.*)? Lores? of Magic:?$/i)
                if (match) {
                    loresToAdd.push({
                        wizardModel: match[1],
                        knowsFrom: knowsFrom.length ? knowsFrom : [match[2]],
                        requiresWizard: line.includes('that is a Wizard'),
                        isWizard: line.includes("Every")
                    })
                }
                continue;
            }
            const matchWizard = line.match(/^AN? (.*) is a (.*)$/i)
            if (matchWizard) {
                const [_, wizardName, wizardLevelText] = matchWizard
                const level = wizardLevelText.match(/\d+/)![0]

                const model = findModel(modelEntries, wizardName)
                if (model) {
                    const wizardText = `Wizard Level ${level}`;
                    const wizardEntry = findImportedEntry(cat, wizardText, "upgrade")
                    const wizardGroup = getGroup(model, "Wizard Level", `${unitName}/${model.name}`)
                    wizardGroup.constraints = [toMinConstraint(1, `${unitName}/${model.name}/wizardlevel`), toMaxConstraint(1, `${unitName}/${model.name}/wizardlevel`)]
                    const link = toEntryLink(wizardText, `${unitName}/${model.name}`, wizardEntry?.id)
                    wizardGroup.entryLinks!.push(link)
                    wizardGroup.defaultSelectionEntryId = link.id;
                } else {
                    console.log([matchWizard[1], matchWizard[2]], "no model")
                }
            }
        }

    }
    if (unit.Subheadings["Options:"]) {
        const parsedOptions = optionsToGroups(unit.Subheadings["Options:"])
        function getScope(scope: string) {
            if (scope === "self") {
                return [modelEntries[0]];
            }
            const foundModel = findModel(modelEntries, scope)
            return foundModel ? [foundModel] : modelEntries
        }
        for (const parsedGroup of parsedOptions.groups) {
            for (const model of getScope(parsedGroup.scope)) {
                const groupHash = `${unitName}/${model.name}/${parsedGroup.entries.map(o => o.what).join(',')}`;
                const group = toGroup(`Choose ${parsedGroup.groupAmount} ${parsedGroup.specification || "options"}`, groupHash)

                for (const parsedEntry of parsedGroup.entries) {
                    const text = parsedEntry.what!
                    let ruleText = parsedEntry.what!.replace(/special rule(s)?/, "").replace(/^The /, "")
                    const { ruleName, param } = parseSpecialRule(ruleText);
                    const ruleEntry = toEntry(ruleText, `${groupHash}/${text}`, parsedGroup.details)
                    ruleEntry.constraints = [toMaxConstraint(1, `${groupHash}/${text}`)]
                    const profile = findImportedProfile(cat, ruleName!, "Special Rule")
                    if (profile) {
                        ruleEntry.infoLinks!.push(toSpecialRuleLink(ruleName!, `${groupHash}/${text}/link`, profile?.id, param))
                        group.selectionEntries!.push(ruleEntry);
                        continue;
                    }
                    const profile2 = findImportedEntry(cat, text, "upgrade")
                    if (!profile2) {
                        console.error("Couldn't import profile", unitName, "/", text)
                    }
                    group.entryLinks?.push(toEquipment(text, `${groupHash}/${text}`, profile2?.id))

                }
                const [min, max] = parsedGroup.groupAmount.split('-');
                group.constraints = [toMinConstraint(min, `${groupHash}`), toMaxConstraint(max, `${groupHash}`)]
                model.selectionEntryGroups!.push(group)
            }
            // console.error(parsedEntry)
            // console.warn(parsedEntry.groupAmount)
        }
        const magicStandard = []
        for (const parsedEntry of parsedOptions.entries) {
            if (parsedEntry.type === "upgrade") {
                // Find and remove the model
                const modelName = parsedEntry.to!.replace(" (champion)", "");
                const model = findModel(modelEntries, modelName)
                if (model) {
                    entry.selectionEntries = entry.selectionEntries.filter(o => o !== model)
                } else {
                    if (modelName.includes("musician")) {
                        const MUSICIAN_ID = "40f2-dd77-f0ca-3663"
                        const group = getGroup(entry, "Command", unitName)
                        const musician = toEntry("Musician", `${unitName}/command`, parsedEntry.details)
                        musician.comment = `upgrades: ${modelEntries[0].id}`
                        musician.infoLinks!.push(toProfileLink("Musician", `${unitName}/command/profile`, MUSICIAN_ID))
                        musician.constraints = [toMaxConstraint(1, `${unitName}/command/musician`)]
                        musician.subType = "crew"
                        musician.type = "model"
                        group.selectionEntries!.push(musician);
                    }
                    else if (modelName.includes('standard bearer')) {
                        const STANDARD_BEARER_ID = "bcf8-d942-102e-b155"
                        const group = getGroup(entry, "Command", unitName)
                        const bearer = toEntry("Standard Bearer", `${unitName}/command`, parsedEntry.details)
                        bearer.infoLinks!.push(toProfileLink("Standard Bearer", `${unitName}/command/profile`, STANDARD_BEARER_ID))
                        bearer.comment = `upgrades: ${modelEntries[0].id}`
                        bearer.constraints = [toMaxConstraint(1, `${unitName}/command/standard bearer`)]
                        bearer.type = "model"
                        bearer.subType = "crew"
                        group.selectionEntries!.push(bearer);
                    } else {
                        console.log(`Couldn't find model to upgrade ${unitName}/${modelName}`)
                    }
                    continue;
                }
                // Make the model a champion
                model.subType = "crew"
                model.infoLinks!.push(toProfileLink("Champion", `${unitName}/command`, "5f1c-fd04-b0d5-d5e"))
                model.constraints!.push(toMaxConstraint(1, `${unitName}/${model.name}/champion`))
                model.comment = `upgrades: ${modelEntries[0].id}`;


                // Add the model to command
                getGroup(entry, "Command", unitName).selectionEntries!.push(model);
            } else if (parsedEntry.type === "replace") {
                for (const model of getScope(parsedEntry.scope)) {
                    // Find the weapon to replace and remove it
                    const weaponName = parsedEntry.what!
                    const toReplace = model.entryLinks!.find(o => cmpItems(o.name, weaponName))
                    if (toReplace) {
                        model.entryLinks = model.entryLinks!.filter(o => o !== toReplace)
                    } else {
                        console.warn("Couldn't find weapon to replace", unitName, model.name, weaponName, "with", parsedEntry.with)
                        continue;
                    }
                    // Create a Equipment group and its entries
                    const newGroup = getGroup(model, "Equipment", `${unitName}/${model.name}`)
                    const replaceWith = parsedEntry.with!
                    const replaceWithEntry = findImportedEntry(cat, replaceWith, "upgrade")
                    const replaceWithLink = toEquipment(replaceWithEntry?.name ?? replaceWith, `${unitName}/${model.name}`, replaceWithEntry?.id)

                    // Remove constraints as we rely on the group
                    toReplace.constraints = []
                    replaceWithLink.constraints = []
                    replaceWithLink.costs = [toCost(parsedEntry.details!)]
                    if (parsedEntry.amount !== "*") {
                        replaceWithLink.constraints.push(toMaxConstraint(parsedEntry.amount, `${unitName}/${model.name}/equipment/${parsedEntry.scope}`, "roster"))
                    }

                    newGroup.defaultSelectionEntryId = toReplace.id
                    newGroup.entryLinks!.push(toReplace)
                    newGroup.entryLinks!.push(replaceWithLink)
                    newGroup.constraints = [toMinConstraint(1, `${unitName}/${model.name}/equipment`), toMaxConstraint(1, `${unitName}/${model.name}/equipment`)]
                }

            } else {
                const upgradeName = parsedEntry.what!
                if (!upgradeName) {
                    console.error(unitName, parsedEntry, "no name")
                    continue;
                }
                const commonGroup = commonGroups(upgradeName, parsedEntry.token)
                for (const model of getScope(parsedEntry.scope)) {
                    switch (commonGroup) {
                        case "Equipment":
                            const group = getGroup(model, commonGroup, `${unitName}/${model.name}`)
                            const equipmentEntry = findImportedEntry(cat, upgradeName, "upgrade")
                            if (!equipmentEntry) {
                                console.error("Couldn't import profile", unitName, "/", upgradeName, parsedEntry.token, parsedEntry)
                            }
                            const equipment = toEquipment(equipmentEntry?.name ?? upgradeName, `${unitName}/${model.name}`, equipmentEntry?.id)
                            equipment.costs = [toCost(parsedEntry.details)]
                            equipment.constraints = [toMaxConstraint(1, `${unitName}/${model.name}/${upgradeName}`)]
                            if (parsedEntry.amount !== "*") {
                                equipment.constraints.push(toMaxConstraint(1, `${unitName}/${model.name}/${upgradeName}/roster`, "roster"))
                            }
                            group.entryLinks?.push(equipment)
                            break;
                        case "Magic Items":
                        case "Vampiric Powers":
                        case "Daemonic Icon":
                        case "Daemonic Gifts":
                            const MAGIC_ITEMS_ID = "1539-fd78-88f-badd"
                            const Ids = {
                                "Magic Items": "1539-fd78-88f-badd",
                                "Daemonic Icon": "e5a3-889f-31ed-d42f",
                                "Daemonic Gifts": "ce0c-2efd-59ad-f802",
                                "Vampiric Powers": "a88c-1e61-583f-2bab",

                            }
                            const link = toGroupLink(commonGroup, `${unitName}/${model.name}`, Ids[commonGroup])
                            if (parseDetails(parsedEntry.details!)) {
                                link.constraints!.push({
                                    type: "max",
                                    value: parseDetails(parsedEntry.details!),
                                    field: "points",
                                    scope: "parent",
                                    shared: false,
                                    id: hashFnv32a(`${unitName}/${model.name}/${commonGroup}/max`)
                                })
                            }
                            model.entryLinks!.push(link)
                            break;
                        case "Wizard Level":
                            const wizardLevel = getGroup(model, commonGroup, `${unitName}/${model.name}`)
                            const match = parsedEntry.what!.match(/\d+/)
                            const wizardLevelName = `Wizard Level ${match![0]}`
                            const wizardEntry = findImportedEntry(cat, wizardLevelName, "upgrade");
                            const wizardLink = toEntryLink(wizardLevelName, `${unitName}/${model.name}`, wizardEntry?.id)
                            wizardLink.costs = [toCost(parsedEntry.details)];
                            if (!wizardLevel.constraints) {
                                wizardLevel.constraints = [toMaxConstraint(1, `${unitName}/${model.name}/wizardlevel`)]
                            }
                            wizardLevel.entryLinks!.push(wizardLink)
                            break;
                        case "Magic Standard":
                            magicStandard.push(parsedEntry);
                            break;
                        case "Mount":
                            model.entryLinks?.push(toEntryLink(`${parsedEntry.token} ${parsedEntry.what}`, `${unitName}/${model.name}`, `${parsedEntry.token} ${parsedEntry.what}`))
                            break;
                        case "Special Rules":
                            const rules = getGroup(model, commonGroup, `${unitName}/${model.name}`)
                            let ruleText = parsedEntry.what!.replace(/special rule(s)?/, "")
                            ruleText = ruleText.replace("\u0007 ", "");
                            ruleText = ruleText.replace("\u0007", "");
                            const { ruleName, param } = parseSpecialRule(ruleText);
                            const ruleEntry = toEntry(ruleText, `${unitName}/${model.name}`, parsedEntry.details)
                            ruleEntry.constraints = [toMaxConstraint(1, `${unitName}/${model.name}/${ruleName}`)]
                            if (parsedEntry.amount !== "*") {
                                if (parsedEntry.amount === "per 1,000 points") {
                                    const rosterMax = toMaxConstraint(0, `${unitName}/${model.name}/${ruleName}/roster`, "roster")
                                    ruleEntry.constraints.push(rosterMax)
                                    const modifier = {
                                        type: "increment",
                                        value: 1,
                                        field: rosterMax.id,
                                        repeats: [
                                            {
                                                value: 1000,
                                                repeats: 1,
                                                field: "limit::points",
                                                scope: "roster",
                                                childId: "any",
                                                shared: true,
                                                roundUp: false,
                                                id: hashFnv32a(`${unitName}/${model.name}/${ruleName}/repeat`)
                                            }
                                        ]
                                    } as BSIModifier;
                                    ruleEntry.modifers!.push(modifier)
                                } else {
                                    const rosterMax = toMaxConstraint(parsedEntry.amount, `${unitName}/${model.name}/${ruleName}/roster`, "roster")
                                    ruleEntry.constraints.push(rosterMax)
                                }
                            }
                            const profile = findImportedProfile(cat, ruleName!, "Special Rule")
                            if (!profile) {
                                console.log(`[SPECIAL RULES] Couldn't find Special Rule: ${ruleName}`)
                                continue;
                            }
                            ruleEntry.infoLinks!.push(toSpecialRuleLink(ruleName!, `${unitName}/${model.name}`, profile.id, param))
                            rules.selectionEntries!.push(ruleEntry);
                            break;

                    }
                }
            }

        }


        if (magicStandard.length) {
            const MAGIC_STANDARD_ID = "6bbe-8054-19b7-e5d6"
            const parsedEntry = magicStandard[0]
            const command = getGroup(entry, "Command", `${unitName}/command`)
            const bearer = command.selectionEntries?.find(o => o.name === "Standard Bearer")!;
            const magicLink = toGroupLink("Magic Standard", `${unitName}/command`, MAGIC_STANDARD_ID)
            magicLink.constraints = [{
                type: "max",
                value: parseDetails(parsedEntry.details!),
                field: "points",
                scope: "parent",
                shared: false,
                id: hashFnv32a(`${unitName}/command/magic standard/max`)
            }]
            bearer.entryLinks!.push(magicLink)
        }
        if (loresToAdd.length) {
            for (const { wizardModel, knowsFrom, requiresWizard } of loresToAdd) {
                const foundModel = findModels(modelEntries, wizardModel);
                const models = foundModel.length ? foundModel : modelEntries
                for (const wantsLore of models) {
                    const group = getGroup(wantsLore, "Lores of Magic", `${unitName}/${wantsLore?.name}`);
                    group.constraints = [toMaxConstraint(1, `${unitName}/${wantsLore.name}/lores of magic`)]
                    for (const magicBranch of knowsFrom) {
                        const found = findImportedEntry(cat, magicBranch, "upgrade")!
                        const link = toEntryLink(magicBranch, `${unitName}/${wantsLore?.name}`, found.id)
                        group.entryLinks!.push(link);
                    }
                    if (requiresWizard || true) {
                        group.modifiers!.push({
                            comment: "Hide if not a wizard",
                            type: "set",
                            value: true,
                            field: "hidden",
                            "conditions": [
                                { type: "equalTo", value: 0, field: "selections", scope: "parent", childId: "7d84-39e9-a5f-947e", shared: true },
                                { type: "equalTo", value: 0, field: "selections", scope: "parent", childId: "8e47-73e8-f7f9-808", shared: true },
                                { type: "equalTo", value: 0, field: "selections", scope: "parent", childId: "59f1-ac46-8123-3f8d", shared: true },
                                { type: "equalTo", value: 0, field: "selections", scope: "parent", childId: "50bd-b918-574a-60c3", shared: true }
                            ],
                        })

                    }
                }
            }
        }
    }

    const addedUnit = $store.add_child("sharedSelectionEntries", cat, entry)
    const existingLink = findRootUnit(cat, unitName)
    if (existingLink) {
        $store.del_child(existingLink);
    }


    const addedLink = $store.add_child("entryLinks", cat, {
        import: true,
        name: unitName,
        hidden: false,
        id: hashFnv32a(`${unitName}/root`),
        type: "selectionEntry",
        targetId: addedUnit.id
    });

}
function createUnits(cat: Catalogue & EditorBase, pages: Page[]) {
    for (const page of pages) {
        for (const unit of page.Units || []) {
            createUnit(cat, unit)
        }
    }
}


const map = {
    "Chaos Dwarfs Legacy Army List": "Chaos Dwarfs",
    "d45e-eeb4-390e-6449": "Skaven",
    "Daemons of Chaos Legacy Army List": "Daemons of Chaos",
    "Dark Elves Legacy Army List": "Dark Elves",
    "Lizardmen Legacy Army List": "Lizardmen",
    "Ogre Kingdoms Legacy Army List": "Ogre Kingdoms",
    "Vampire Counts Legacy Army List": "Vampire Counts",
}
// ALL
$catalogue.manager.loadAll().then(async () => {
    function replaceSlashes(path: string) {
        return path.replaceAll("\\", "/");
    }
    function dirname(path: string) {
        return replaceSlashes(path).split("/").slice(0, -1).join("/");
    }
    const systemPath = dirname($catalogue.fullFilePath)
    const fileName = "processed_7.json"
    const jsonPath = `${systemPath}/json/${fileName}`
    const file = await $node.readFile(jsonPath)
    if (!file) return;
    const read = JSON.parse(file.data)
    const files = $catalogue.manager.getAllLoadedCatalogues();
    files.map(o => o.processForEditor());
    for (const catalogue of Object.keys(read)) {
        const pages = Object.values(read[catalogue]) as Page[];
        const catalogueName = map[catalogue as keyof typeof map];
        const existing = files.find(o => o.name === catalogueName) as Catalogue & EditorBase
        if (!existing) {
            console.warn(`Couldn't find catalogue for ${catalogueName}(${catalogue})`)
            continue;
        }
        console.log(" --- BEGINNING", catalogueName)
        updateSharedProfiles(existing, pages)
        updateSpecialRules(existing, pages)
        updateWeapons(existing, pages)
        createUnits(existing, pages)
        console.log(" --- DONE", catalogueName);
    }
});