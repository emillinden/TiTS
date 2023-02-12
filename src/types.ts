export type DateInput = string | Date;

export interface TimeEntry {
  issueKey: string;
  description: string;
  timeSpent: number;
}

export interface ConfigFile {
  togglApiKey: string;
  tempoApiKey: string;
  tempoAuthorAccountId: string;
}

// TODO: Replace with enum and use better names
export type ConfigKeys = "toggl" | "tempo" | "tempoAuthorAccountId";

export interface TogglTimeEntryArgs {
  apiKey: string;
  startDate: string;
  endDate: string;
}

export interface TogglTimeEntry {
  id: number;
  project_id: number | null;
  description: string;
  duration: number;
  start: string;
  stop: string | null; // null if entry is running
}

export interface TogglProjectArgs {
  apiKey: string;
  projectId: number;
}

export interface TempoTimeEntryPostArgs {
  issueKey: string;
  /** Author account ID obtained from Jira settings */
  authorAccountId: string;
  timeSpentSeconds: number;
  /** Date in YYYY-MM-DD format */
  startDate: string;
  /** Time in HH:mm:ss format */
  startTime: string;
  description?: string;
  remainingEstimateSeconds?: number;
  billableSeconds?: number;
  attributes?: TempoTimeEntryPostArgsAttribute[];
}

export interface TempoTimeEntryPostArgsAttribute {
  key: string;
  value: string;
}

export interface TempoTimeEntryPostResponse {}

export interface JiraIssue {
  accountKey: string;
  iconUrl: string;
  id: number;
  internalIssue: boolean;
  issueStatus: string;
  issueType: string;
  key: string;
  parentIssue: {
    iconUrl: string;
    issueType: string;
    summary: string;
  };
  parentKey: string;
  projectId: number;
  projectKey: string;
  reporterKey: string;
  summary: string;
}

export type IssueKey = string | null;

export type FixMeLater = any;
