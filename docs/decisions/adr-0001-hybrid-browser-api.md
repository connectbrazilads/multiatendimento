# ADR-0001: Hybrid Browser + API Connector Architecture

- Status: Accepted as directional architecture, partially implemented in schema only
- Date: 2026-05-15

## Context

The current production system integrates messaging and AI providers through direct APIs. This is the dominant architecture today:

- Evolution API for WhatsApp transport and session handling
- Gemini API for AI execution

However, the schema includes `MetaInstance` and `metaBrowserSession`, which signals a future need to support providers or channels that are not fully operable through stable APIs alone.

## Decision

The platform should evolve toward a hybrid connector model where:

- API-based execution is preferred whenever providers offer stable operational APIs
- browser-backed execution is reserved for channels that require UI-driven authentication, missing APIs, or automation fallback

Current implementation note:

- this ADR is architectural direction
- active browser runtime is not present in this repository

## Rationale

Why not API-only forever:

- some customer-facing channels have incomplete APIs
- some session flows may remain browser-mediated
- operational recovery may require fallback automation

Why not browser-only:

- browser runtimes are heavier, slower, and less reliable at scale
- API integrations are easier to audit, retry, and secure
- API-first transport is superior for high-throughput message operations

## Consequences

Positive:

- preserves flexibility for future Meta and social channel integrations
- supports capability-level provider substitution
- avoids hard-coding the platform around a single transport assumption

Negative:

- introduces a more complex connector abstraction model
- adds future session security requirements
- requires explicit observability and lifecycle management for browser automation

## Alternatives Considered

### Alternative A: API-Only Connector Strategy

Rejected because it would constrain future channel support and reduce product adaptability.

### Alternative B: Browser-First Strategy

Rejected because current production transport already works better with provider-managed APIs and webhooks.

## Implementation Guidance

When browser connectors are added:

- isolate sessions per tenant and connector
- encrypt persisted browser session artifacts
- expose capabilities through explicit manifests
- route browser execution through dedicated worker processes, not the main API runtime

