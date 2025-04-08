export interface TempoAccountGetResponse {
  self:     string;
  metadata: Metadata;
  results:  Result[];
}

export interface Metadata {
  count:  number;
  offset: number;
  limit:  number;
}

export interface Result {
  self:           string;
  key:            string;
  id:             number;
  name:           string;
  status:         Status;
  global:         boolean;
  lead:           Lead;
  contact?:       Contact;
  category?:      Category;
  customer?:      Category;
  links:          Links;
  monthlyBudget?: number;
}

export interface Category {
  self:  string;
  key:   string;
  id:    number;
  name:  string;
  type?: TypeClass;
}

export interface TypeClass {
  name: Name;
}

export enum Name {
  Billable = "Billable",
}

export interface Contact {
  displayName?: string;
  type:         TypeEnum;
  self?:        string;
  accountId?:   string;
}

export enum TypeEnum {
  External = "EXTERNAL",
  User = "USER",
}

export interface Lead {
  self:      string;
  accountId: string;
}

export interface Links {
  self: string;
}

export enum Status {
  Closed = "CLOSED",
  Open = "OPEN",
}
