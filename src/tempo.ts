import axios from "axios";
import { getConfig } from "./config";
import { validateIssueKey } from "./issue-key";
import {
  TempoPostResponse,
  TempoWorklogGetResponse,
  TempoWorklogPostArgs,
} from "./types";
import { TempoAccountGetResponse } from "./types/TempoAccountTypes";

const TEMPO_API_3_BASE_URL = "https://api.tempo.io/core/3";
const TEMPO_API_4_BASE_URL = "https://api.tempo.io/4";
const TEMPO_API_HEADERS = {
  Authorization: `Bearer ${getConfig("tempoApiToken")}`,
  "Content-Type": "application/json",
};

export const postTempoWorklog = async (
  tempoTimeEntry: TempoWorklogPostArgs
): Promise<TempoPostResponse> => {
  try {
    const res = await axios.post<TempoPostResponse>(
      `${TEMPO_API_3_BASE_URL}/worklogs`,
      tempoTimeEntry,
      {
        headers: TEMPO_API_HEADERS,
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
): Promise<TempoWorklogGetResponse> => {
  try {
    const res = await axios.get<TempoWorklogGetResponse>(
      `${TEMPO_API_3_BASE_URL}/worklogs/issue/${issueKey}`,
      { headers: TEMPO_API_HEADERS }
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

    return res.self ? true : false;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const getTempoAccounts = async (): Promise<TempoAccountGetResponse> => {
  try {
    const res = await axios.get<TempoAccountGetResponse>(
      `${TEMPO_API_4_BASE_URL}/accounts?limit=5000`,
      { headers: TEMPO_API_HEADERS }
    );

    return res.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
