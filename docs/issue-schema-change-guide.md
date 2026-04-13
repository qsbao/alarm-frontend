# Issue Schema Change Guide

How to add, rename, or remove a field on the `Issue` entity. Every layer must stay in sync — this checklist covers all of them.

---

## Files to touch (in order)

### 1. Backend model — `backend/src/main/java/com/fabalarm/model/Issue.java`

- Add/remove the field declaration with JPA annotations
- Add/remove the getter and setter
- For a collection field (e.g. `labels`), use `@ElementCollection` + a join table; initialize to `new HashSet<>()`
- For an enum field, add `@Enumerated(EnumType.STRING)` and create the enum class in the same package if it doesn't exist

### 2. Frontend types — `frontend/src/types.ts`

- Mirror the change in `export interface Issue`
- Optional fields use `?`; required fields do not
- `IssueDraft = Omit<Issue, 'id' | 'activity'>` picks up changes automatically — no edit needed there

### 3. Seed data — `backend/src/main/resources/data.sql`

- Update every `INSERT INTO issue (...)` to include/exclude the column
- For a join-table collection (like `issue_label`), add separate `INSERT INTO issue_label (issue_id, label)` rows
- Column name in SQL follows snake_case of the Java `@Column(name = ...)` annotation

### 4. Controller — `backend/src/main/java/com/fabalarm/controller/IssueController.java`

- Update any request-body mapping that manually copies fields from DTO → entity (look for `issue.setXxx(...)` calls)
- Update any response projection if the controller builds a DTO manually

### 5. Service — `backend/src/main/java/com/fabalarm/service/IssueService.java`

- Update any field-level logic (filtering, defaulting, validation) that references the changed field

### 6. RelationService — `backend/src/main/java/com/fabalarm/service/RelationService.java`

- Check for any field copy when creating a related entity from an Issue

### 7. Frontend hooks

| Hook | What to check |
|---|---|
| `frontend/src/hooks/useIssues.ts` | filter/sort logic that reads the field |
| `frontend/src/hooks/useIssue.ts` | single-issue fetch mapping |
| `frontend/src/hooks/useFilteredIssues.ts` | filter predicates |

### 8. Frontend components

Search for the old field name across `frontend/src/components/` and `frontend/src/pages/`. Common hotspots:

| File | What to check |
|---|---|
| `components/issues/IssueRow.tsx` | table cell rendering |
| `components/issues/IssueTable.tsx` | column definitions |
| `components/issues/FilterBar.tsx` | filter UI controls |
| `components/issue-detail/IssueHeader.tsx` | header display |
| `components/issue-detail/AlarmList.tsx` | alarm-to-issue context |
| `components/issue-detail/MergeDialog.tsx` | merge form fields |
| `components/issue-detail/PullMergeDialog.tsx` | pull-merge form fields |
| `components/alarms/CreateIssueFromAlarmModal.tsx` | issue creation form |
| `pages/AlarmDetailPage.tsx` | alarm detail → issue link |
| `components/DevPanel.tsx` | dev seed panel |

### 9. Stores — `frontend/src/stores/issueStore.ts`

- Update any optimistic-update logic that spreads or patches issue fields

### 10. Backend tests

Run a global search for the old field name across `backend/src/test/`:

```
grep -r "oldFieldName" backend/src/test/
```

Key test files that typically need updates:

| File | Why |
|---|---|
| `IssueEndpointTest.java` | POST/PUT body construction |
| `IssueMergeEndpointTest.java` | merge payload |
| `IssueAlarmEndpointTest.java` | alarm-to-issue linking |
| `IssueSeedDataTest.java` | seed data assertions |
| `RelationEndpointTest.java` | relation payloads |
| `WorkflowEndpointTest.java` | workflow trigger payloads |
| `HighlightCandidateTest.java` | highlight logic |

---

## Quick search commands

Find all references to a field before you start:

```bash
# Backend
grep -r "oldFieldName\|getOldField\|setOldField" backend/src/

# Frontend
grep -r "oldFieldName" frontend/src/
```

---

## Checklist

- [ ] `Issue.java` — field + getter/setter
- [ ] `types.ts` — `Issue` interface
- [ ] `data.sql` — all INSERT rows + join-table rows if applicable
- [ ] `IssueController.java` — DTO mapping
- [ ] `IssueService.java` — field logic
- [ ] `RelationService.java` — field copy
- [ ] `useIssues.ts`, `useIssue.ts`, `useFilteredIssues.ts` — hook logic
- [ ] Components (IssueRow, IssueTable, FilterBar, IssueHeader, AlarmList, MergeDialog, PullMergeDialog, CreateIssueFromAlarmModal, AlarmDetailPage, DevPanel)
- [ ] `issueStore.ts` — optimistic updates
- [ ] Backend tests — all files under `backend/src/test/`
