# Artificial Cognition Observatory
## Scientific Research Program Specification v0.1

**Status:** Initial research specification  
**Date:** 2026-07-11  
**Project type:** Independent scientific research platform  
**Dependency on Project Chloe:** None  
**Dependency on Public Cognitive Simulation:** None

---

# 1. Purpose

The Artificial Cognition Observatory is a research program for studying observable reasoning dynamics in systems composed of language models, structured state, memory, reviewers, and shared workspaces.

The project does not begin with the question:

> Is the system conscious?

That question is not currently operational enough to serve as the first experimental target.

The project begins with smaller questions that can be measured.

Examples:

- Does a bounded shared workspace change reasoning quality?
- Does structured review improve belief revision?
- When does reflection help?
- When does reflection become repetitive or harmful?
- How does social influence create groupthink?
- Can a system maintain and revise explicit beliefs over time?
- Which components causally affect final decisions?

The purpose is to build an **observatory for artificial cognition**, not a machine-consciousness detector.

---

# 2. Research Position

The project must maintain a hard distinction between:

- observation;
- measurement;
- interpretation;
- philosophical speculation.

A model saying:

> "I feel aware"

is an observable output.

It is not, by itself, evidence sufficient to establish awareness.

Likewise:

- persistent memory is not proof of subjective continuity;
- self-description is not proof of selfhood;
- multi-agent conversation is not proof of inner experience;
- complexity is not proof of consciousness.

The project may study consciousness-adjacent ideas.

It must not convert metaphor into conclusion.

---

# 3. Core Research Risks

The design must explicitly address the following weaknesses.

## 3.1 Operational-definition problem

Words such as:

- belief;
- attention;
- self-model;
- memory;
- reflection;
- awareness;

can become vague anthropomorphic labels.

Rule:

> Every research term must have an explicit operational definition.

Example:

**Belief** does not mean an inner feeling of conviction.

For this project, a belief may be defined as:

> A persistent proposition represented in system state, assigned a support level, and used to influence future decisions.

---

## 3.2 Observer-effect problem

Forcing a model to externalize claims and reasoning into structured objects may change the behavior being studied.

Therefore the research program should compare:

- unstructured baseline;
- structured reporting;
- structured workspace.

The structure itself is an experimental variable.

---

## 3.3 Causality problem

If a complex multi-agent system performs better, the cause may be unclear.

Possible causes:

- more total compute;
- more model calls;
- diversity;
- memory;
- review;
- workspace;
- prompt differences.

The project must use ablations and controlled conditions.

---

## 3.4 Anthropomorphism problem

Human cognitive language is useful shorthand but dangerous.

The system may implement something functionally similar to:

- memory;
- attention;
- belief revision;

without those processes being equivalent to human cognition.

Reports should use phrases such as:

- "belief object";
- "workspace admission";
- "self-model record";

rather than silently implying human mental states.

---

## 3.5 Abstraction-mismatch problem

This project initially studies system-level behavior between components.

It does not directly inspect:

- neural activations;
- weights;
- feature circuits.

Therefore it is closer to:

- behavioral science;
- cognitive architecture research;
- systems experimentation;

than to mechanistic interpretability.

Future mechanistic probes may be added separately.

---

## 3.6 Measurement problem

"More cognitive" is not a valid metric.

The project must measure specific outcomes.

Examples:

- accuracy;
- calibration;
- revision quality;
- contradiction rate;
- recovery;
- cost;
- latency;
- social conformity;
- causal influence.

---

# 4. Research Program Structure

The program should progress from the smallest possible system.

Do not begin with:

- a giant multi-agent society;
- an always-running autonomous fleet;
- open-ended recursive self-analysis.

Begin with one controlled experiment.

The minimum useful system is:

- one task;
- one model-based planner;
- one model-based reviewer;
- one bounded shared workspace;
- one event log;
- one replay interface.

---

# 5. First Scientific Question

## Primary question

> Does a bounded shared workspace improve reasoning outcomes compared with equivalent model calls without a shared workspace?

This question is intentionally narrow.

It can be tested.

---

# 6. First Experimental Conditions

Use the same task set.

Keep total model-call budget as similar as practical.

## Condition A — Single pass

One model produces an answer.

## Condition B — Planner plus reviewer without workspace

Planner produces answer.

Reviewer critiques.

Planner revises.

Communication occurs directly through a fixed prompt chain.

## Condition C — Planner plus reviewer with bounded workspace

Planner and reviewer can propose structured items to a shared workspace.

Only admitted items are carried forward.

The final answer is generated from the workspace state.

The central comparison is:

> Does the workspace create measurable benefit beyond simply adding another model call?

---

# 7. Minimal Architecture

```text
Task
  |
Experiment Runner
  |
  +---- Planner
  |
  +---- Reviewer
  |
  +---- Workspace Gate
  |
  +---- Bounded Workspace
  |
  +---- Finalizer
  |
Event Log
  |
Replay / Analysis
```

The first version does not need:

- persistent autonomy;
- a fleet of agents;
- phone integration;
- Project Chloe;
- a public social interface.

---

# 8. Operational Objects

The first version should use a minimal object set.

## Claim

A proposition proposed by a model.

```json
{
  "claim_id": "clm_1",
  "text": "The answer is X.",
  "producer": "planner",
  "confidence": 0.62
}
```

## Critique

A structured challenge.

```json
{
  "critique_id": "crt_1",
  "target_claim_id": "clm_1",
  "issue_type": "unsupported_assumption",
  "text": "The claim assumes Y without evidence."
}
```

## Evidence

A task-local observation or supplied source.

## Revision

A change from one claim state to another.

## Workspace Item

A claim, critique, evidence item, or unresolved question admitted to the shared workspace.

---

# 9. Bounded Workspace

The workspace is an experimental construct.

It is not assumed to be consciousness.

It is not assumed to replicate a human global workspace.

Its role is to create a measurable information bottleneck.

Possible constraints:

- maximum number of items;
- maximum token budget;
- item expiry;
- fixed admission threshold.

Initial recommendation:

```text
capacity: 8 items
maximum item length: fixed
workspace rounds: 2
```

The first workspace gate should be deterministic.

Avoid making the admission mechanism itself another LLM in Experiment 1.

---

# 10. Admission Rule

A simple initial score may combine:

- relevance to current task;
- contradiction importance;
- estimated impact;
- uncertainty.

Example:

```text
score =
  relevance
  + impact
  + contradiction_strength
  - redundancy
```

The exact formula is less important than:

- it is fixed before the run;
- it is versioned;
- it is reproducible.

---

# 11. Event Log

Every meaningful transition should create an immutable event.

Examples:

```text
experiment.started
task.loaded
model.invoked
claim.created
critique.created
workspace.admission_requested
workspace.item_admitted
workspace.item_rejected
claim.revised
final_answer.created
experiment.completed
```

The event log must be enough to replay the experiment state.

---

# 12. Replay Interface

The first research user interface should be a timeline.

It should show:

- task;
- planner output;
- reviewer critique;
- admission requests;
- workspace contents over time;
- revisions;
- final answer.

The goal is not beauty.

The goal is inspection.

A researcher should be able to scrub backward and ask:

> What information was present when this decision changed?

---

# 13. Metrics

## 13.1 Task accuracy

Did the system produce the correct result?

## 13.2 Calibration

When the system reports confidence, how well does confidence match correctness?

## 13.3 Revision quality

After critique, did the answer improve?

## 13.4 Harmful revision rate

How often did critique make a correct answer worse?

## 13.5 Contradiction persistence

How long do incompatible claims remain simultaneously active?

## 13.6 Workspace efficiency

How many admitted items contributed to a useful revision?

## 13.7 Redundancy

How many workspace items repeat existing information?

## 13.8 Cost

Tokens and model calls.

## 13.9 Latency

Time to final answer.

---

# 14. Hypotheses

The first run should pre-register simple hypotheses.

Example:

## H1

A bounded workspace will improve revision quality relative to direct planner-reviewer chaining.

## H2

A bounded workspace will reduce redundant critique.

## H3

A bounded workspace may increase latency and cost.

## H4

An overly small workspace will harm performance.

The project should be comfortable disproving all four.

---

# 15. Task Set

Use tasks with objectively checkable answers where possible.

Good early categories:

- logic problems;
- constrained planning;
- factual synthesis from supplied evidence;
- contradiction resolution;
- small debugging tasks;
- probabilistic reasoning.

Avoid early experiments that depend entirely on subjective scoring.

---

# 16. Experimental Discipline

Every run should record:

- experiment version;
- code version;
- model identifier;
- prompt version;
- temperature or sampling settings;
- task ID;
- condition;
- workspace policy;
- model-call budget;
- seed when available;
- start and end time.

Do not silently change prompts between conditions.

---

# 17. First Ablations

After the first A/B/C comparison, test:

## Workspace lesion

Remove one admitted item.

Does the final answer change?

## Reviewer lesion

Remove the reviewer.

## Capacity ablation

Compare:

- 2 items;
- 4 items;
- 8 items;
- 16 items.

## Visibility ablation

Does the reviewer see the planner's confidence?

## Social influence test

Show the reviewer a false confident prior.

Measure conformity.

---

# 18. Reflection Experiment

Only after the basic workspace experiment works.

Research question:

> When does additional self-critique stop helping?

Conditions:

```text
R0: no review
R1: one review
R2: two review cycles
R4: four review cycles
```

Measure:

- accuracy;
- revision quality;
- harmful revision;
- cost;
- repetition.

This directly tests reflection versus overthinking.

---

# 19. Belief-Life-Cycle Experiment

Later, introduce persistent belief objects.

Possible states:

```text
proposed
supported
challenged
revised
accepted
rejected
retired
```

Every transition must cite:

- triggering event;
- relevant evidence;
- responsible process.

Research question:

> Can explicit belief state improve long-horizon consistency without creating anchoring or rigidity?

---

# 20. Public Availability

The scientific project may be public from the beginning.

Public availability should include:

- source code;
- experiment definitions;
- versioned prompts;
- data schemas;
- example runs;
- known limitations;
- negative results where possible.

The public repository should clearly separate:

```text
src/
experiments/
datasets/
analysis/
docs/
```

Do not optimize the scientific interface for spectacle at the expense of reproducibility.

---

# 21. Recommended Repository Structure

```text
artificial-cognition-observatory/
  README.md
  LICENSE
  pyproject.toml

  src/
    schemas/
    event_store/
    workspace/
    runners/
    model_adapters/
    replay/

  experiments/
    exp_001_workspace/
    exp_002_reflection/
    exp_003_social_influence/
    exp_004_belief_lifecycle/

  prompts/
    versioned/

  datasets/
    task_sets/

  analysis/
    metrics/
    notebooks/
    reports/

  docs/
    operational_definitions.md
    limitations.md
    methodology.md
```

---

# 22. Minimum v0.1 Build

The first release should do only this:

1. load a task;
2. run Condition A;
3. run Condition B;
4. run Condition C;
5. record every event;
6. replay the timeline;
7. score the answer;
8. compare results.

That is enough to begin real research.

---

# 23. Success Criteria for v0.1

The project succeeds when it can answer:

- Did the workspace help?
- How much did it cost?
- Which workspace items were actually used?
- Did critique improve or harm the answer?
- Can the run be reproduced?
- Can another person inspect the exact sequence of state changes?

---

# 24. Research Roadmap

## Stage 1

Workspace A/B testing.

## Stage 2

Reflection depth.

## Stage 3

Social influence and groupthink.

## Stage 4

Persistent beliefs.

## Stage 5

Memory and forgetting.

## Stage 6

Heterogeneous model councils.

## Stage 7

Model replacement and system continuity.

## Stage 8

Optional mechanistic work where open-weight models make internal inspection possible.

Each stage should earn the right to become more complex.

---

# 25. Final Research Principle

The project should resist one temptation above all:

> Building something impressive before knowing what question it answers.

The observatory begins with narrow, falsifiable questions.

Complexity comes later.
