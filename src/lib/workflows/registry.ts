import type { WorkflowDefinition } from './types';
import { spcOocDefinition } from './definitions/spcOoc';
import { genericIssueDefinition } from './definitions/genericIssue';

const definitions = new Map<string, WorkflowDefinition>();

definitions.set(spcOocDefinition.id, spcOocDefinition);
definitions.set(genericIssueDefinition.id, genericIssueDefinition);

export function getDefinition(id: string): WorkflowDefinition | undefined {
  return definitions.get(id);
}

export function getAllDefinitions(): WorkflowDefinition[] {
  return Array.from(definitions.values());
}
