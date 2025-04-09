export type DateInput = string | Date;

export interface TimeEntry {
  issueKey: string;
  description: string;
  timeSpent: number;
}

export interface TogglTimeEntryArgs {
  startDate: string;
  endDate: string;
}

export interface TogglStopTimerArgs {
  timeEntryId: number;
}

export interface TogglTimeEntry {
  /** Time Entry ID */
  id: number;
  /** Time Entry description, null if not provided at creation/update */
  description: string | null;
  /** When was last updated */
  at: string;
  /** Whether the time entry is marked as billable */
  billable: boolean;
  /** Time entry duration. For running entries should be -1 * (Unix start time) */
  duration: number;
  /** Used to create a TE with a duration but without a stop time, this field is deprecated for GET endpoints where the value will always be true. */
  duronly: boolean;
  /** Project ID, legacy field */
  pid: number;
  /** Project ID. Can be null if project was not provided or project was later deleted */
  project_id: number | null;
  /** When was deleted, null if not deleted */
  server_deleted_at: string | null;
  /** Start time in UTC */
  start: string;
  /** Stop time in UTC, can be null if it's still running or created with "duration" and "duronly" fields */
  stop: string;
  /** Tag IDs, null if tags were not provided or were later deleted */
  tag_ids: number[];
  /** Tag names, null if tags were not provided or were later deleted */
  tags: string[];
  /** Task ID. Can be null if task was not provided or project was later deleted */
  task_id: number | null;
  /** Task ID, legacy field */
  tid: number;
  /** Time Entry creator ID, legacy field */
  uid: number;
  /** Time Entry creator ID */
  user_id: number;
  /** Workspace ID, legacy field */
  wid: number;
  /** Workspace ID */
  workspace_id: number;
}

export interface TogglProjectArgs {
  projectId: number;
}

export interface TempoWorklogGetResponse {
  /** Current request url */
  self: string;
  metadata: TempoResponseMetadata;
  results: TempoWorklog[];
}

export interface TempoPostResponse extends TempoWorklog {}

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
    values: any[];
  };
}

export interface TempoResponseMetadata {
  /** Default 50 */
  count: number;
  offset: number;
  /** Default 50 */
  limit: number;
  /** Next page request url */
  next: string | null | undefined;
  /** Previous page request url */
  prev: string | null | undefined;
}

export interface TempoWorklogPostArgs {
  issueKey?: string;
  issueId?: string;
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
