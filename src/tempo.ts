import axios from "axios";
import { TempoTimeEntryPostArgs, TempoTimeEntryPostResponse } from "./types";

const TEMPO_API_BASE_URL = "https://api.tempo.io/core/3";

export const postTempoTimeEntry = async (
  apiKey: string,
  tempoTimeEntry: TempoTimeEntryPostArgs
) => {
  try {
    const res = await axios.post<TempoTimeEntryPostResponse>(
      `${TEMPO_API_BASE_URL}/worklogs`,
      tempoTimeEntry,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
