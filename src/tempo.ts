import axios from "axios";
import {
  TempoWorklog,
  TempoWorklogPostArgs,
  TempoWorklogsGetArgs,
  TempoWorklogsGetResponse,
} from "./types";

const TEMPO_API_BASE_URL = "https://api.tempo.io/core/3";

export const postTempoWorklog = async (
  apiKey: string,
  tempoTimeEntry: TempoWorklogPostArgs
) => {
  try {
    const res = await axios.post<TempoWorklog>(
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

export const getTempoWorklogs = async (
  apiKey: string,
  tempWorklogArgs: TempoWorklogsGetArgs
): Promise<TempoWorklogsGetResponse> => {
  try {
    const res = await axios.get<TempoWorklogsGetResponse>(
      `${TEMPO_API_BASE_URL}/worklogs`,
      {
        params: tempWorklogArgs,
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
