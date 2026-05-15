# ADR-0002: Persistent Sessions and Durable Operational State

- Status: Accepted
- Date: 2026-05-15

## Context

The platform manages ongoing customer conversations, team assignment, knowledge retrieval, scheduled work, and media processing. Stateless request handling is insufficient for this type of system.

The current repository already persists:

- tenant configuration
- messaging instances
- contacts
- tickets
- messages
- ticket events
- scheduled messages
- knowledge assets
- media artifacts

## Decision

The system will use persistent session and state coordination rather than stateless orchestration.

In the current implementation, persistence is split across:

- provider-managed transport session state through Evolution
- relational operational state in PostgreSQL
- local media persistence in filesystem storage

## Rationale

Operational messaging systems require continuity across:

- process restarts
- operator handoffs
- delayed media retrieval
- scheduled outbound messages
- AI summaries and historical review

Without durable state, the platform would lose its operational integrity.

## Consequences

Positive:

- supports recoverable workflows
- enables auditability
- makes human and AI handoff practical
- allows async enrichment and retry loops

Negative:

- introduces data retention and security obligations
- creates migration pressure around local filesystem storage
- requires careful coordination if horizontally scaled

## Alternatives Considered

### Alternative A: Stateless Runtime with Provider-Only State

Rejected because product features such as summaries, service orders, ticket queues, and business rules depend on application-owned durable state.

### Alternative B: Pure In-Memory Session Manager

Rejected because restarts and deployments would degrade customer continuity and operator trust.

## Implementation Guidance

Next-stage improvements:

- move media persistence to object storage
- move retry and scheduling logic to queue-backed workers
- introduce leader election or dedicated worker role for cron ownership
- formalize outbox/event patterns for stronger delivery semantics

