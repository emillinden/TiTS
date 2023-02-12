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

export interface TempoWorklogPostArgs {
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
  attributes?: TempoWorklogPostArgsAttribute[];
}

export interface TempoWorklogPostArgsAttribute {
  key: string;
  value: string;
}

export interface TempoWorklogsGetArgs {
  /** Date in YYYY-MM-DD format */
  from: string;
  /** Date in YYYY-MM-DD format */
  to: string;
  /** Date in YYYY-MM-DD format */
  updatedFrom?: string;
  issue?: string[];
  project?: string[];
  offset?: number;
  /** Default 50, max 1000 */
  limit?: number;
}

export interface TempoWorklogsGetResponse {
  metadata: TempoGetResponseMetadata;
  results: TempoWorklog[];
}

export interface TempoGetResponseMetadata {
  count: number;
  offset: number;
  limit: number;
  next: string | null;
  previous: string | null;
}

export interface TempoWorklog {
  tempoWorklogId: number;
  jiraWorklogId: number;
  issue: {
    self: string;
    key: string;
    id: number;
  };
  timeSpentSeconds: number;
  billableSeconds: number;
  startDate: string;
  startTime: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  author: {
    self: string;
    accountId: string;
    displayName: string;
  };
  attributes: {
    self: string;
    values: FixMeLater[];
  };
}

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
