# StudyDuo Security Specification (Phase 0 — Payload-First Security TDD)

## 1. Data Invariants

1. **PII Isolation**: User emails and private preferences live exclusively in `/users/{userId}/private/{docId}` and are readable/writable ONLY by `request.auth.uid == userId`. `/users/{userId}` holds only public study metadata (name, username, avatar, XP, streak).
2. **Owner-Only Roadmap & Official Tasks**: Only the goal's `ownerId` can create, update, reorder, publish, or delete `/goals/{goalId}/phases/{phaseId}`, `/goals/{goalId}/days/{dayId}`, and `/goals/{goalId}/days/{dayId}/tasks/{taskId}`. Collaborators have read-only access to published roadmap items.
3. **Independent Completion Ownership & Idempotency**: A user may only create a task completion record at `/goals/{goalId}/completions/{completionId}` where `userId == request.auth.uid` and `completionId == taskId + '_' + request.auth.uid`. Users cannot complete tasks on behalf of their partner or overwrite historical completion records.
4. **Immutable XP Ledger**: `/xpTransactions/{transactionId}` is append-only (`allow update, delete: if false`), keyed deterministically (`{userId}_{sourceType}_{sourceId}`), preventing duplicate XP farming or historical score rewrites.
5. **Private Journal Confidentiality**: `/journalEntries/{entryId}` is strictly private to `userId` unless `isSharedWithOwner == true && sharedWithOwnerId == request.auth.uid`.
6. **Master Gate Membership**: Access to every goal subcollection requires verified membership in `/goals/{goalId}` (`request.auth.uid in goal.participantIds`).
7. **Invitation Boundaries**: Only goal owners may create or cancel invitations. Accepting an invitation is a one-way transition from `pending` to `accepted` and cannot transition back.
8. **Temporal Integrity**: All `createdAt` and `updatedAt` timestamps on Firestore writes must equal `request.time`.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Identity Spoofing on Goal Creation**: User B sends `{ ownerId: "userA", participantIds: ["userA"], ... }` to `/goals/g1` -> DENIED (`ownerId != request.auth.uid`).
2. **Collaborator Official Task Edit**: User B (collaborator) attempts `update` on `/goals/g1/days/d1/tasks/t1` to change `title` or `xpReward` -> DENIED (owner-only).
3. **Partner Completion Hijack**: User A attempts `create` on `/goals/g1/completions/t1_userB` with `{ userId: "userB", ... }` -> DENIED (`userId != request.auth.uid`).
4. **XP Ledger Tampering**: User A attempts `update` or `delete` on `/xpTransactions/userA_task_t1` to inflate `xpAmount` -> DENIED (`allow update, delete: if false`).
5. **Shadow Ghost Field Injection**: User A sends `{ ..., isAdmin: true }` when updating `/users/userA` -> DENIED (`hasOnly` / strict schema).
6. **PII Cross-Read**: User B attempts `get` on `/users/userA/private/settings` -> DENIED (`request.auth.uid != userId`).
7. **Private Journal Snooping**: Goal Owner A attempts `get` on User B's journal entry where `isSharedWithOwner == false` -> DENIED.
8. **ID Poisoning**: Attacker writes document with 500-char ID or slashes/special chars -> DENIED (`isValidId`).
9. **Client Timestamp Forgery**: User submits backdated `createdAt: "2020-01-01"` instead of `serverTimestamp()` -> DENIED (`createdAt == request.time`).
10. **Invitation State Reversal**: User updates an already `accepted` or `cancelled` invitation back to `pending` -> DENIED (terminal state lock).
11. **Oversized Array / String DoS**: User creates a phase with 50 objectives or a 20KB title -> DENIED (`.size()` limits).
12. **Blanket List Scraping**: Attacker runs unfiltered `list` on `/journalEntries` or `/notifications` -> DENIED (`resource.data` ownership enforcement).
