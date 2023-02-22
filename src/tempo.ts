import axios from "axios";
import { getConfig } from "./config";
import { validateIssueKey } from "./issue-key";
import {
  TempoGetResponse,
  TempoPostResponse,
  TempoWorklogPostArgs,
  TempoWorklogsGetArgs,
} from "./types";

const TEMPO_API_BASE_URL = "https://api.tempo.io/core/3";

export const postTempoWorklog = async (
  tempoTimeEntry: TempoWorklogPostArgs
): Promise<TempoPostResponse> => {
  try {
    const res = await axios.post<TempoPostResponse>(
      `${TEMPO_API_BASE_URL}/worklogs`,
      tempoTimeEntry,
      {
        headers: {
          Authorization: `Bearer ${getConfig("tempoApiToken") as string}`,
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
  tempWorklogArgs: TempoWorklogsGetArgs
): Promise<TempoGetResponse> => {
  try {
    const res = await axios.get<TempoGetResponse>(
      `${TEMPO_API_BASE_URL}/worklogs`,
      {
        params: tempWorklogArgs,
        headers: {
          Authorization: `Bearer ${getConfig("tempoApiToken") as string}`,
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

export const getTempoWorklogByIssueKey = async (
  issueKey: string
): Promise<TempoGetResponse> => {
  try {
    const res = await axios.get<TempoGetResponse>(
      `${TEMPO_API_BASE_URL}/worklogs/issue/${issueKey}`,
      {
        headers: {
          Authorization: `Bearer ${getConfig("tempoApiToken") as string}`,
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

export const checkIfIssueKeyExists = async (
  issueKey: string
): Promise<boolean> => {
  if (!validateIssueKey(issueKey)) return false;

  try {
    const res = await getTempoWorklogByIssueKey(issueKey);

    if (res.self) return true;
    return false;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
