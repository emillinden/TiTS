import { TogglTimeEntry } from "./types";

export function groupEntries(entries: TogglTimeEntry[]): TogglTimeEntry[] {
  const groupedEntries: TogglTimeEntry[] = [];
  const entriesMap = new Map<string, TogglTimeEntry>();

  entries.forEach((entry) => {
    const key = entry.description;
    if (entriesMap.has(key)) {
      entriesMap.get(key)!.duration += entry.duration;
    } else {
      entriesMap.set(key, { ...entry });
      groupedEntries.push(entriesMap.get(key)!);
    }
  });

  return groupedEntries;
}
