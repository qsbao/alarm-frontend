import type { Issue, IssueStatus } from '../../types';

export type UserId = string;

export interface PayloadFieldSchema {
  kind: 'enum' | 'text';
  label: string;
  required: boolean;
  options?: string[]; // for enum kind
  minLength?: number; // for text kind
}

export type PayloadSchema = Record<string, PayloadFieldSchema>;

export interface Action {
  id: string;
  label: string;
  required: boolean;
  gate: (ctx: { user: { id: UserId }; instance: WorkflowInstance; issue: Issue }) => boolean;
  payloadSchema: PayloadSchema;
  sendsBackTo?: string; // phaseId
}

export interface Phase {
  id: string;
  label: string;
  status: IssueStatus;
  actions: Action[];
}

export interface RoleResolver {
  role: string;
  resolve: (issue: Issue, mocks: Record<string, unknown>) => UserId | undefined;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  phases: Phase[];
  requiredRoles: RoleResolver[];
}

export interface ActionRecord {
  id: string;
  actionId: string;
  phaseId: string;
  actorId: UserId;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface WorkflowActor {
  userId: UserId;
  role: string;
}

export interface WorkflowInstance {
  definitionId: string;
  currentPhaseId: string;
  actors: WorkflowActor[];
  completedActions: Record<string, ActionRecord[]>; // keyed by phaseId
  actionHistory: ActionRecord[]; // full history including rework duplicates
  completedAt?: string; // ISO 8601 — set on terminal
}

export interface WorkflowActivityEntry {
  definitionId: string;
  phaseId: string;
  actionId: string;
  actorId: UserId;
  fromPhaseId: string;
  toPhaseId: string;
  timestamp: string;
}

export interface ApplyActionSuccess {
  instance: WorkflowInstance;
  issue: Issue;
  activityEntry: WorkflowActivityEntry;
}

export interface ApplyActionError {
  error: string;
}

export type ApplyActionResult = ApplyActionSuccess | ApplyActionError;

export interface AttachWorkflowSuccess {
  instance: WorkflowInstance;
  issue: Issue;
  activityEntry: WorkflowActivityEntry;
}

export interface AttachWorkflowError {
  error: string;
}

export type AttachWorkflowResult = AttachWorkflowSuccess | AttachWorkflowError;
