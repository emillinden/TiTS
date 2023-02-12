import axios from "axios";
import {
  TogglTimeEntry,
  TogglTimeEntryArgs
} from "./types";

const TOGGL_API_BASE_URL = "https://api.track.toggl.com/api/v9";

export const fetchTogglTimeEntries = async ({
  apiKey,
  startDate,
  endDate,
}: TogglTimeEntryArgs) => {
  try {
    const res = await axios.get<TogglTimeEntry[]>(
      `${TOGGL_API_BASE_URL}/me/time_entries?start_date=${startDate}&end_date=${endDate}`,
      {
        auth: {
          username: apiKey,
          password: "api_token",
        },
        params: {
          start_date: startDate,
          end_date: endDate,
        },
      }
    );

    return res.data;
  } catch (error) {
    throw error;
  }
};

export const mergeDuplicateTogglTimeEntries = (entries: TogglTimeEntry[]) => {
  const entriesMap = new Map<string, TogglTimeEntry>();

  entries.forEach((entry) => {
    const key = entry.description;
    if (entriesMap.has(key)) {
      entriesMap.get(key)!.duration += entry.duration;
    } else {
      entriesMap.set(key, { ...entry });
    }
  });

  return Array.from(entriesMap.values());
};
