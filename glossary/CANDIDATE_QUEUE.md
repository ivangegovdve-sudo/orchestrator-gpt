# Glossary candidate queue

`glossary/candidates/pending.json` is a holding area for terms that may deserve a glossary entry. It is deliberately not an input to `scripts/build-glossary-bundle.cjs`, so placing a term in the queue never publishes it.

## Add candidates safely

Prepare a local JSON document containing a `candidates` array, then run:

```text
node scripts/glossary-candidate-queue.cjs --input proposals.json
```

Each candidate has exactly three input fields:

- `term`: 2–32 public-term characters, beginning with a letter
- `evidenceCount`: a positive integer no greater than 1,000,000
- `sourceKinds`: one or more coarse labels from `manual`, `repository`, `sessions`, or `email`

The command validates the complete batch before writing. It rejects private-shaped or opaque credential-shaped terms, arbitrary metadata, raw excerpts, custom corpus labels, paths, URLs, and other fields that could carry private material. Its output reports counts only; it does not print candidate values.

Both an input batch and the pending queue are capped at 500 candidates. Re-running the same input is idempotent. Matching terms are compared case-insensitively, their greatest observed count is retained, and their coarse source classes are combined.

## Promote only after human review

For each candidate selected for promotion:

1. Verify what the term means using an authoritative public source.
2. Write the definition and its citation through the established `glossary/verified-terms.json` input.
3. Run `node scripts/build-glossary-bundle.cjs` and the glossary checks.
4. Review the generated diff, then remove the completed candidate from the pending queue.

There is no automatic promotion command. A candidate without a human-reviewed definition and citation remains pending and unpublished.
