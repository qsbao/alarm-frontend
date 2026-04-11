import type { Issue, IssueStatus } from '../../types';

export type UserId = string;

export type StepStatus = 'pending' | 'ongoing' | 'completed' | 'skipped';

export interface PayloadFieldSchema {
  kind: 'enum' | 'text';
  label: string;
  required: boolean;
  options?: string[]; // for enum kind
  minLength?: number; // for text kind
}

export type PayloadSchema = Record<string, PayloadFieldSchema>;

export interface Step {
  id: string;
  label: string;
  order: number; // display only — does not influence DAG
  preSteps: string[]; // step ids that must be completed/skipped before this step activates
  gate?: (ctx: { user: { id: UserId }; instance: WorkflowInstance; issue: Issue }) => boolean;
  payloadSchema?: PayloadSchema;
  impliesStatus?: IssueStatus;
  defaultSkipIf?: (issue: Issue) => boolean;
  skippableIf?: (issue: Issue) => boolean;
}

export interface RoleResolver {
  role: string;
  resolve: (issue: Issue, mocks: Record<string, unknown>) => UserId | undefined;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  steps: Step[];
  requiredRoles: RoleResolver[];
}

export interface StepState {
  status: StepStatus;
  payload?: Record<string, unknown>;
  completedAt?: string;
  completedBy?: UserId;
  skippedAt?: string;
  skippedBy?: UserId;
}

export interface WorkflowActor {
  userId: UserId;
  role: string;
}

export interface WorkflowInstance {
  definitionId: string;
  stepStates: Record<string, StepState>;
  actors: WorkflowActor[];
  completedAt?: string; // ISO 8601 — set when all steps are completed/skipped
}

export interface WorkflowActivityEntry {
  definitionId: string;
  stepId: string;
  action: 'attach' | 'complete' | 'skip' | 'revive';
  actorId: UserId;
  timestamp: string;
}

export interface AttachWorkflowSuccess {
  instance: WorkflowInstance;
  issue: Issue;
  activityEntry: WorkflowActivityEntry;
}

export interface AttachWorkflowError {
  error: string;
}

export type AttachWorkflowResult = AttachWorkflowSuccess | AttachWorkflowError;

export interface CompleteStepSuccess {
  instance: WorkflowInstance;
  issue: Issue;
  activityEntry: WorkflowActivityEntry;
}

export interface CompleteStepError {
  error: string;
}

export type CompleteStepResult = CompleteStepSuccess | CompleteStepError;

export interface SkipStepSuccess {
  instance: WorkflowInstance;
  issue: Issue;
  activityEntry: WorkflowActivityEntry;
}

export interface SkipStepError {
  error: string;
}

export type SkipStepResult = SkipStepSuccess | SkipStepError;

export interface ReviveStepSuccess {
  instance: WorkflowInstance;
  issue: Issue;
  activityEntry: WorkflowActivityEntry;
}

export interface ReviveStepError {
  error: string;
}

export type ReviveStepResult = ReviveStepSuccess | ReviveStepError;
