# Project Chloe
## Distributed Personal AI Platform — Engineering Specification v0.2

**Status:** Architecture specification  
**Date:** 2026-07-11  
**Primary goal:** Build a voice-first personal AI platform that remains useful, resilient, and easy to upgrade as models, agent runtimes, providers, and devices change.

---

# 1. Executive Summary

Project Chloe is a persistent personal AI platform with a fast conversational surface and a deeper distributed backend.

The central design requirement is **replaceability**.

Chloe must not become permanently dependent on:

- one language model;
- one model provider;
- one agent framework;
- one orchestration library;
- one cloud provider;
- one worker machine;
- one device;
- one memory implementation;
- one voice stack.

The stable parts of Chloe should be:

- Chloe's own protocols;
- task and capability schemas;
- state transitions;
- policy rules;
- identity boundaries;
- audit history.

Everything else should be replaceable behind adapters.

Chloe is best understood as a small personal AI platform or control plane.

It is **not** a single agent.

---

# 2. Product Vision

The user should experience Chloe as one continuous assistant.

Internally, Chloe may use:

- multiple models;
- multiple machines;
- multiple runtimes;
- multiple specialized workers;
- local and cloud resources;
- mobile capabilities;
- asynchronous background work.

The user should not need to care which worker performed a task unless that information is useful.

The system should support two distinct speeds.

## 2.1 Fast path

Used for:

- live voice;
- conversational responses;
- clarification;
- simple tool use;
- immediate acknowledgments;
- routing.

The fast path prioritizes low latency.

## 2.2 Deep path

Used for:

- complex reasoning;
- research;
- long-running tasks;
- planning;
- code;
- review;
- verification;
- multi-worker collaboration.

The deep path prioritizes quality, traceability, and resilience.

The two paths may operate simultaneously.

---

# 3. Non-Goals

Project Chloe is not:

- a consciousness experiment;
- a scientific cognitive architecture;
- a public philosophical simulation;
- a single-agent chatbot;
- a framework wrapper;
- a permanent commitment to ZeroClaw, Ollama, MCP, or any other runtime.

Those technologies may be used, but Chloe remains conceptually independent of them.

---

# 4. Fundamental Architecture Rule

## Own the protocol, rent the intelligence

Chloe should define stable interfaces around unstable technology.

For example, Chloe should not ask:

> "Send this to Framework X."

It should ask:

> "Find a healthy worker that satisfies these capabilities and execute this typed task."

Likewise, Chloe should not permanently encode:

> "This must use Model Y."

It should encode:

> "This requires strong reasoning, tool use, long context, and cloud access is permitted."

The system can then choose an implementation.

---

# 5. High-Level Architecture

```text
User
  |
Voice / UI Client
  |
Turn Manager
  |
Chloe Gateway
  |
Task Orchestration Engine
  |---- Policy Engine
  |---- Capability Registry
  |---- Memory Services
  |---- Event Log / Audit
  |---- Durable Task Queue
  |
  +---- Worker Runtime A
  +---- Worker Runtime B
  +---- Local Worker
  +---- Phone Worker / Capability Node
  +---- Specialist Advisors
  +---- External Apps / Clients
```

This is a logical architecture.

Early versions may combine several logical services into one process.

---

# 6. Layer Model

Chloe should be divided into explicit layers.

## Layer 1 — Human Interface

Responsibilities:

- voice input;
- voice output;
- text interface;
- interruption;
- streaming;
- user-visible status;
- approval prompts;
- notifications.

The interface should not own durable business logic.

---

## Layer 2 — Conversation and Turn Management

Responsibilities:

- current conversational state;
- user interruptions;
- cancellation of stale work;
- mapping delayed results back to the correct conversation;
- deciding whether a response is provisional, final, or background.

A delayed backend result must never be blindly spoken into a changed conversation.

---

## Layer 3 — Chloe Core

This is the stable control plane.

It owns:

- task identity;
- goal identity;
- capability matching;
- worker selection;
- task leases;
- retries;
- cancellation;
- approval workflow;
- durable state transitions.

This layer should be as deterministic as practical.

A model may assist planning, but the model does not become the scheduler.

---

## Layer 4 — Runtime Adapters

This layer connects Chloe to agent runtimes and execution environments.

Examples may include:

- ZeroClaw;
- custom Python workers;
- MCP servers;
- cloud agent SDKs;
- local shell workers;
- browser automation systems;
- future runtimes.

A runtime adapter translates between Chloe's protocol and the runtime's native behavior.

### ZeroClaw's role

ZeroClaw may be:

- a worker runtime;
- a local tool host;
- a phone-side agent runtime if the operating system and deployment permit it;
- a lightweight execution environment on a cloud or local node.

ZeroClaw is **not required** to be Chloe's orchestrator.

Chloe must survive replacing ZeroClaw.

---

## Layer 5 — Model Adapters

Models are pluggable capabilities.

Possible categories:

- low-latency conversational model;
- high-quality reasoning model;
- local private model;
- coding model;
- vision model;
- speech model.

The core should depend on a normalized model interface.

Example:

```text
generate()
stream()
tool_call()
structured_output()
embed()
transcribe()
synthesize_speech()
```

Provider-specific features may be exposed as optional extensions.

---

## Layer 6 — Device and Tool Capabilities

Tools are typed, permissioned capabilities.

Examples:

- save a file;
- read a file;
- create a notification;
- use a browser;
- access a database;
- run code;
- invoke a phone intent;
- use a camera;
- query a home system.

A tool definition should include:

- name;
- schema;
- risk class;
- permissions;
- reversibility;
- timeout;
- idempotency behavior;
- approval requirements.

---

## Layer 7 — Client Applications

Applications may use Chloe without becoming part of Chloe.

Examples:

- LifeOS;
- a personal dashboard;
- a project manager;
- a mobile app;
- a web interface;
- a research console.

### LifeOS's role

LifeOS should be treated as an optional client or workload above Chloe.

It may help the user:

- organize goals;
- manage personal knowledge;
- interact with long-term plans;
- create workflows.

It should call Chloe through stable APIs.

Chloe should not be embedded inside LifeOS, and LifeOS should not define Chloe's internal architecture.

Dropping LifeOS later should not require rebuilding Chloe.

---

# 7. Core Objects

Chloe should use explicit typed objects.

## Goal

A user or system objective.

## Task

A unit of executable work.

## Capability

A declared ability available from a worker or device.

## Worker

A process or node capable of accepting tasks.

## Artifact

A produced result.

## Memory

Durable information intended to influence future behavior.

## Event

An immutable statement that something happened.

## Approval

A user or policy decision allowing an action.

---

# 8. Task Protocol

A task should be independent of the worker that runs it.

Example:

```json
{
  "task_id": "tsk_123",
  "goal_id": "goal_42",
  "type": "document.summarize",
  "requirements": {
    "capabilities": ["model.reasoning"],
    "privacy": "local_or_approved_cloud",
    "latency": "background",
    "quality_tier": "high"
  },
  "input_refs": ["artifact_88"],
  "status": "queued",
  "attempt": 0
}
```

A task belongs to Chloe.

A worker only receives a temporary lease.

---

# 9. Worker Protocol

Every worker should support a common minimum lifecycle.

```text
register
advertise capabilities
heartbeat
accept task lease
report progress
renew lease
submit result
submit failure
graceful shutdown
```

A worker may run:

- on Hostinger;
- on Oracle Cloud;
- on a home computer;
- on another cloud;
- on a phone;
- inside a future runtime.

The orchestration logic should not care.

---

# 10. Capability Registry

The registry answers:

> What can currently perform this task?

Capabilities should include metadata such as:

- availability;
- current load;
- location;
- cost class;
- privacy class;
- model list;
- hardware;
- tool access;
- latency class.

Routing should be based on capabilities and policy, not hard-coded hostnames.

---

# 11. Phone Worker Architecture

The phone may be a real worker.

The important distinction is:

> The phone is a replaceable execution node, not the source of truth.

A phone worker may contain:

- a lightweight runtime such as ZeroClaw if practical;
- a native capability host;
- scripts or native functions;
- optional local model inference;
- secure remote command handling.

Possible capabilities:

- save or move files within permitted scopes;
- show notifications;
- open apps;
- invoke app intents;
- use share sheets;
- collect approved sensor input;
- confirm user presence;
- perform local private inference.

The phone must be treated as intermittently available.

States may include:

- online;
- sleeping;
- offline;
- locked;
- permission denied;
- battery constrained.

Chloe must continue operating without it.

---

# 12. Orchestration Model

The Chloe core should initially prefer mediated coordination.

Workers should not freely create uncontrolled peer-to-peer conversations.

Default pattern:

```text
worker
  -> event / task result
  -> Chloe core
  -> next task
  -> worker
```

Why:

- easier debugging;
- explicit ownership;
- lower loop risk;
- clear provenance;
- predictable cost;
- simpler failure recovery.

Direct agent collaboration may still exist through explicit protocols.

Examples:

- independent parallel solving;
- planner / executor / reviewer;
- bounded debate;
- structured council.

Each collaboration protocol should have:

- fixed roles;
- bounded rounds;
- stop conditions;
- structured outputs.

---

# 13. Specialist Advisors

Chloe may run small read-only advisor processes.

Examples:

- consistency advisor;
- cost advisor;
- recovery advisor;
- memory-quality advisor;
- anomaly advisor.

They may observe selected event streams.

They may emit recommendations.

They must not:

- execute external actions;
- alter security policy;
- approve risky actions;
- rewrite durable state without mediation.

Rule:

> Models may notice. Deterministic code decides.

---

# 14. Memory Architecture

Memory should be explicit and typed.

Suggested categories:

## Conversation memory

Recent conversational context.

## Working memory

Current goals, tasks, decisions, and unresolved issues.

## Episodic memory

Specific historical events.

## Semantic memory

Stable extracted facts.

## Procedural memory

Reusable workflows and skills.

## Preference memory

User-approved durable preferences.

No model context window should be considered the durable memory system.

Memory should support:

- provenance;
- revision;
- conflict detection;
- expiration;
- forgetting;
- user correction.

---

# 15. Event Architecture

Important changes should create structured events.

Examples:

```text
goal.created
task.created
task.leased
task.started
task.progressed
task.failed
task.retried
task.completed
worker.online
worker.offline
worker.capability_changed
approval.requested
approval.granted
tool.executed
memory.created
memory.revised
advisor.recommendation
```

The event log is critical for:

- debugging;
- replay;
- audits;
- failure analysis;
- future migrations.

---

# 16. Queue and Delivery Semantics

The initial implementation should support:

- durable tasks;
- retry policies;
- dead-letter handling;
- leases;
- idempotency keys.

A task should not be lost because:

- a machine reboots;
- a process crashes;
- the network drops;
- a provider times out.

Externally meaningful actions should be designed to avoid accidental duplication.

---

# 17. Failure Recovery

Failure is normal.

## Worker loss

If a worker stops heartbeating:

- mark it unavailable;
- allow active leases to expire;
- requeue retryable tasks;
- select another compatible worker.

## Provider outage

Use:

- another provider;
- another model;
- local inference;
- delayed execution.

## Phone offline

Phone-only capability becomes unavailable.

Unrelated work continues.

## Malformed model output

Validate against schema.

Reject or retry safely.

## Infinite retry risk

Use:

- retry budget;
- exponential backoff;
- dead-letter state;
- human-visible diagnosis.

---

# 18. Security Architecture

Security policy must remain outside the LLM.

The system should use:

- least privilege;
- scoped credentials;
- signed worker identities;
- typed tool permissions;
- sandboxed execution;
- explicit audit logs;
- human approval for meaningful risk.

Suggested action classes:

## Class 0

Read-only, low-risk.

## Class 1

Reversible local action.

## Class 2

Meaningful external side effect.

## Class 3

Financial, destructive, identity-sensitive, or high-risk.

Class 3 requires explicit user confirmation.

---

# 19. Upgradeability Strategy

Upgradeability is a first-class requirement.

## 19.1 Version every interface

Version:

- worker protocol;
- task schema;
- capability schema;
- event schema;
- tool schema;
- model adapter interface.

## 19.2 Use adapters

New model or runtime:

```text
new technology
   -> adapter
   -> stable Chloe interface
```

## 19.3 Avoid framework-specific state

Durable state should use Chloe-owned schemas.

## 19.4 Support side-by-side migration

A new worker implementation should be able to run beside an old one.

Example:

```text
ZeroClaw worker v1
Custom worker v2
```

Both advertise the same capability.

Routing can gradually shift.

## 19.5 Record implementation metadata

Every result should record:

- worker version;
- runtime version;
- model identifier;
- adapter version.

This makes regressions diagnosable.

---

# 20. Recommended Initial Deployment

## Coordinator node

Runs:

- Chloe API;
- orchestration engine;
- durable task database;
- capability registry;
- policy engine;
- event log.

## Hostinger node

Runs one or more general workers.

## Oracle or other low-cost cloud node

Runs redundant workers or lightweight services.

## Home computer

Runs:

- Ollama;
- local tools;
- private files;
- code execution;
- heavier local work.

## Phone

Runs:

- device capability host;
- optional lightweight runtime;
- local actions;
- user-presence confirmation.

The first version may have one coordinator.

Durable state must survive coordinator restart.

---

# 21. Build Order

## Phase 0 — Protocol-only simulator

No LLM.

Build:

- task schema;
- worker registry;
- capability registry;
- heartbeat;
- lease;
- retry;
- event log.

Use fake workers.

## Phase 1 — One model adapter

Add one model provider.

Do one bounded task.

## Phase 2 — Fast conversation path

Add:

- streaming input;
- turn manager;
- low-latency response;
- background delegation.

## Phase 3 — Distributed workers

Add:

- Hostinger;
- home worker;
- remote worker protocol;
- failure tests.

## Phase 4 — Phone worker

Start with safe capabilities.

## Phase 5 — Memory

Add typed durable memory.

## Phase 6 — Advisors

Add one read-only advisor.

## Phase 7 — Structured councils

Only after single-worker execution is stable.

## Phase 8 — Alternative runtimes

Run multiple runtime implementations side by side.

---

# 22. Required Failure Tests

Chloe v0.2 is not robust until it can pass:

1. worker dies mid-task;
2. provider goes offline;
3. duplicate completion arrives;
4. coordinator restarts;
5. phone disappears;
6. model returns invalid structure;
7. delayed answer becomes stale;
8. advisor emits bad recommendation;
9. tool call times out;
10. old and new runtime versions coexist.

---

# 23. Architecture Decision Records

Every major decision should be recorded as an ADR.

Example:

```text
ADR-001
Decision: Chloe owns the worker protocol.
Reason: Prevent framework lock-in.
Alternatives: Adopt ZeroClaw as system-wide control plane.
Consequence: More adapter work, much greater replaceability.
```

This preserves the reason behind the architecture.

---

# 24. Definition of Done for the First Useful Chloe

The first useful release should allow the user to:

- speak to Chloe;
- receive a fast answer;
- delegate a deeper task;
- continue talking while that task runs;
- survive one worker failure;
- route work to another node;
- invoke a safe phone capability when available;
- inspect task status;
- see why a failure occurred;
- replace at least one model adapter without changing the core;
- replace at least one runtime adapter without changing the core.

---

# 25. Final Architectural Position

Project Chloe should be:

- boring at the center;
- flexible at the edges;
- fast in conversation;
- deliberate in deep work;
- resilient to worker failure;
- independent of model fashion;
- explicit about state;
- strict about permissions.

The durable asset is not any current AI model.

It is the system's protocol, history, and boundaries.
