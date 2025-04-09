import axios from "axios";
import { getConfig } from "./config";
import { validateIssueKey } from "./issue-key";
import {
  TempoPostResponse,
  TempoWorklogGetResponse,
  TempoWorklogPostArgs,
} from "./types";
import { TempoAccountGetResponse } from "./types/TempoAccountTypes";

const TEMPO_API_BASE_URL = "https://api.tempo.io/4";
const TEMPO_API_HEADERS = {
  Authorization: `Bearer ${getConfig("tempoApiToken")}`,
  "Content-Type": "application/json",
};

export const getIssueIdFromKey = async (
  issueKey: string
): Promise<string | null> => {
  try {
    const jiraUrl = getConfig("jiraUrl") as string;
    const jiraEmail = getConfig("jiraEmail") as string;
    const jiraToken = getConfig("jiraApiToken") as string;

    // Check if required config values are present
    if (!jiraUrl || !jiraEmail || !jiraToken) {
      console.log(
        "Missing Jira configuration. Please run the config command to set up Jira integration."
      );
      return null;
    }

    const auth = {
      username: jiraEmail,
      password: jiraToken,
    };

    const res = await axios.get(`${jiraUrl}/rest/api/3/issue/${issueKey}`, {
      auth,
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (res.status === 401) {
      console.log("Jira authentication failed. Please check your credentials.");
      return null;
    }

    if (res.status === 404) {
      console.log(`Issue ${issueKey} not found in Jira.`);
      return null;
    }

    if (res.status >= 400) {
      console.log(
        `Error fetching issue from Jira: ${res.status} ${res.statusText}`
      );
      return null;
    }

    return res.data.id;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const postTempoWorklog = async (
  tempoTimeEntry: TempoWorklogPostArgs
): Promise<TempoPostResponse> => {
  try {
    if (tempoTimeEntry.issueKey && !tempoTimeEntry.issueId) {
      const issueId = await getIssueIdFromKey(tempoTimeEntry.issueKey);
      if (issueId) {
        tempoTimeEntry.issueId = issueId;
      } else {
        throw new Error(
          `Failed to get issueId for issueKey: ${tempoTimeEntry.issueKey}`
        );
      }
    }

    const { issueKey, ...tempoTimeEntryV4 } = tempoTimeEntry;

    const res = await axios.post<TempoPostResponse>(
      `${TEMPO_API_BASE_URL}/worklogs`,
      tempoTimeEntryV4,
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
    const issueId = await getIssueIdFromKey(issueKey);
    if (!issueId) {
      throw new Error(`Failed to get issueId for issueKey: ${issueKey}`);
    }

    const res = await axios.get<TempoWorklogGetResponse>(
      `${TEMPO_API_BASE_URL}/worklogs?issue=${issueId}`,
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
    const issueId = await getIssueIdFromKey(issueKey);
    return !!issueId;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const getTempoAccounts = async (): Promise<TempoAccountGetResponse> => {
  try {
    const res = await axios.get<TempoAccountGetResponse>(
      `${TEMPO_API_BASE_URL}/accounts?limit=5000`,
      { headers: TEMPO_API_HEADERS }
    );

    return res.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
