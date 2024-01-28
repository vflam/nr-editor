export function hashFnv32a(str: string, seed = 198209835) {
  /*jshint bitwise:false */
  let i,
    l,
    hval = seed === undefined ? 0x811c9dc5 : seed;

  for (i = 0, l = str.length; i < l; i++) {
    hval ^= str.charCodeAt(i);
    hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
  }

  return `${hval >>> 0}`;
}
export function removeTextInParentheses(str: string) {
  return str.replace(/\([^()]*\)/g, '');
}
export function getOnlyTextInParentheses(str: string) {
  let matches = str.match(/\(([^)]+)\)/g);
  if (matches) {
    return matches.map(match => match.slice(1, -1)).join('; ');
  } else {
    return '';
  }
}

export function extractTextAndDetails(str: string) {
  const result = []
  let inDetails = false
  let current = {text: "", details: "" as string | null}
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === "(") {
      inDetails = true;
      continue;
    } else if (char === ")") {
      inDetails = false;
      result.push({...current})
      current.text = "";
      current.details = ""
      continue;
    }
    if (inDetails) {
      current.details += char;
    } else {
      current.text += char;
    }
  }
  if (current.text.trim()) {
    result.push(current)
  }

  for (const found of result) {
    found.text = removePrefix(found.text.trim(), ", ");
    if (!(found.details as string).trim()) {
      found.details = null;
    }
  }
  return result;
}
export interface Sortable {   toString: () => string; }
export function sortByAscending<T>(array: T[], getKey: (item: T) => Sortable): T[] {   return [...array].sort((a,b) => (getKey(a) ?? "").toString().localeCompare((getKey(b) ?? "").toString(), undefined, { numeric: true })) }
export function isSameCharacteristics(a: any[], b: any[]) {
  const hashA = sortByAscending(a, (o) => o.name).map(o => o.$text).join('::')
  const hashB = sortByAscending(b, (o) => o.name).map(o => o.$text).join('::')
  return hashA === hashB
}
export function splitByCenterDot(str: string) {
  // Check if the string contains any center dots
  if (!str.includes('•')) {
    return { "all": str };
  }

  // Split by center dot and initialize the result object
  const items = str.split('•').filter(Boolean); // Filter out any empty strings
  const result = { "all": "" } as Record<string, string> & { all?: string };

  // Iterate over each item, split by the first colon, and populate the result object
  items.forEach(item => {
    const [key, ...valueParts] = item.split(':');
    const value = valueParts.join(':').trim(); // Re-join in case there are multiple colons
    const fixedKey = replaceSuffix(removeSuffix(key.trim(), "s"), "ve", "f");
    result[fixedKey] = value;
  });

  return result;
}
export function removeSuffix(from: string, suffix: string): string {
  if (from.endsWith(suffix)) {
    return from.substring(0, from.length - suffix.length);
  }
  return from;
}
export function removePrefix(from: string, prefix: string): string {
  if (from.startsWith(prefix)) {
    return from.substring(prefix.length);
  }
  return from;
}
export function replaceSuffix(str: string , suffix: string, replace: string) {
  // Check if the string ends with the specified suffix
  if (str.endsWith(suffix)) {
    // Remove the suffix from the end of the string and append the replacement
    return str.slice(0, -suffix.length) + replace;
  } else {
    // If the string does not end with the specified suffix, return it unchanged
    return str;
  }
}

export function splitAnd(str: string) {
  // Split the string by ", " and " and "
  const parts = str.split(/, | and /);
  return parts.map(o => removePrefix(removePrefix(o.trim(), "a "), "and "));

}

export function replaceNewlineWithSpace(text: string) {
  // Replace `\n` preceded by `,` with just a space.
  return text.replace(/,\s*\n\s*/g, ', ');
}