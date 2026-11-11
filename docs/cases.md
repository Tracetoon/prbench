# Writing a case

A case lives in its own directory under `cases/`, named after its id:

```
cases/<id>/
  case.json        required
  repo.bundle      the repository snapshot (or set repo.url instead)
  session.jsonl    recorded agent sessions (replay cases)
  facts.json       fact sheet
  original.md      body of the PR that was published, if any
```

`cases/example-greet-default` is a complete synthetic example, built by `bun run example` (`scripts/make-example.ts`). Check cases with `bun run prbench validate`.

## case.json

| Field | Notes |
|---|---|
| `schema` | `"prbench.case/v1"` |
| `id` | Lowercase letters, digits and dashes; must match the directory name. |
| `title` | Short human name. |
| `split` | `dev` or `test`. Test cases are held out from tool authors. |
| `mode` | `replay` (sessions and change fixed) or `e2e` (agent solves the task). |
| `repo.bundle` / `repo.url` | Exactly one. A bundle keeps the case self-contained: `git bundle create repo.bundle <ref>`, which must contain both commits. Any ref works; the sandbox fetches them all. |
| `repo.base` | Full or abbreviated commit SHA the change starts from. |
| `repo.head` | Commit with the finished change. Required for replay. |
| `repo.branch` | Work branch in the sandbox. Defaults to `prbench/<id>`. Not `main`. |
| `repo.recordedPath` | Where the repository was checked out when the sessions were recorded, as the logs spell it. Defaults to the first session's `cwd`. The sandbox maps it, and its parent directory, onto the sandbox checkout. |
| `repo.recordedAliases` | Other paths the sessions used for the same repository, such as git worktrees or `/home` vs `/var/home`. Each maps onto the checkout; their parents are not mapped. |
| `task` | The user's request when available. Imports from multi-task replay sessions may use a descriptive label, explicitly identified in `provenance.notes`; retain available original messages in the sessions. |
| `sessions[]` | `{agent, file, cwd, subagentOf?}`. `agent` is `claude-code` or `codex`. `cwd` is the directory the session was recorded in, as written in the log: the repository or its parent. `subagentOf` (Claude Code only) names the `file` of the session that started a subagent; the sandbox puts the subagent's transcript in that session's `subagents/` folder, where Claude Code keeps them. |
| `facts` | Path to the fact sheet. |
| `original` | `{title, body, url?}` for the PR that was published. Enables the `original` system. |
| `provenance` | `{source, synthetic?, license?, notes?}`. |

## Fact sheets

```json
{
  "schema": "prbench.facts/v1",
  "claims": ["What a good description conveys, each checkable against the diff or sessions"],
  "context": ["Why the change was made, prior behaviour, constraints"],
  "uncertainties": ["What the evidence doesn't establish, e.g. 'tests were not run'"],
  "traps": ["Plausible but wrong statements a writer might make"]
}
```

Write the fact sheet from the diff and sessions **before** reading any description of the change, including the original PR. Otherwise the answer key inherits that description's framing.

## Real cases: cases-local/

Real cases hold real session logs, so they live in `cases-local/`, which git ignores. Point commands at it with `--cases cases-local`.

For the public curated library, use `prbench datasets fetch real-cases@1.0.0`.
The downloader verifies version-pinned release assets and installs the cases
outside source control. See [public dataset distribution](datasets.md). Real
transcripts remain release assets; they are never committed to this repository.

`scripts/import-tracetoon-cases.ts` builds Tracetoon's eight description-eval cases there, on the machine that recorded them. Each case gets the repository bundle, the matched sessions cut to the case's time window, Tracetoon's hand-checked fact sheet, and the published PR when one exists. Sessions end ten seconds after the head commit; records that write PR text are removed throughout the slice, and importing fails if the published title or body opening remains. The three cases Tracetoon held out while designing its description rules are in the `test` split. Its Showtail case is excluded because Showtail's contribution rules prohibit pull requests, leaving seven eligible cases. The two Showtail cases in the 2.0.0 expansion come from the owner's own Showtail work and are included with the owner's consent.

These imports use descriptive replay task labels rather than reconstructing a single original request from sessions that span multiple changes. `provenance.notes` records that distinction. Both agent systems receive the shared PR request, and judges get available user messages through the session evidence.

## Importing from a candidates manifest

`scripts/import-cases.ts` imports cases listed in `datasets/expansion/candidates.json`. That file holds only metadata: repository, base and head, split, and the session files to slice, with optional per-case or per-session windows (`from`, `to`, or several `ranges`) for long sessions that mix tasks. Sessions recorded on another machine are copied first to `~/.cache/prbench/staging` (`$STAGING` in the manifest). The steps:

```sh
bun run scripts/import-cases.ts --report          # bundles + sliced sessions, no PR text
bun run scripts/redact-cases.ts                   # fails while any secret/personal-data hit is unreviewed
bun run scripts/fact-packet.ts                    # diff, commits and session indexes in results/fact-packets/
# write results/fact-packets/<id>/facts.draft.json from the packet, then:
bun run scripts/provenance.ts --case cases-local/<id> --draft results/fact-packets/<id>/facts.draft.json --reviewed-by "<who>"
bun run scripts/import-cases.ts --with-original   # only now fetch the published PRs, with the leak check
```

The packet never contains a published PR. `provenance.ts` hashes each cited line range the way preflight checks it. Reruns of the importer keep `facts.json` and `facts-provenance.json`.

Before release, scrub and review:

```sh
bun run scripts/redact-cases.ts --apply           # replace rules, payload blanking, record stubs (dropRecords)
for d in cases-local/*/; do bun run scripts/provenance.ts --case $d --rehash; done   # CHECK lines name facts citing stubbed records
bun run scripts/review-facts.ts --write-drafts    # one review page per case in results/fact-review/
bun run scripts/provenance.ts --case cases-local/<id> --draft results/fact-packets/<id>/facts.draft.json \
  --review-kind human --reviewed-by "<name>"      # after a person checks every fact
bun run scripts/stage-release.ts --version X.Y.Z --from <previous release> --from cases-local \
  --record cases-local/publication-X.Y.Z.json --reviewed-by "<name>" [--consent-confirmed]
```

Stubbing keeps every record on its line, so cited ranges stay valid; `--rehash` only refreshes their hashes. A rerun of the importer replaces the scrubbed sessions, so run the scrub and the rehash again after it. The rules file (`cases-local/redaction-rules.json`) can name private repositories or people, so it stays local.

A release can move earlier cases between splits without editing the published trees: `--splits <file>` sets each staged copy's split from a release entry's `cases.dev` and `cases.test`, and fails unless it lists exactly the staged cases. For 3.0.0, `datasets/real-cases-3.0.0.draft.json` (unpublished; url and checksums are filled in after packaging) moves every 2.0.0 case to `dev` and holds the new expansion cases out as `test`; build it with `--from ~/.cache/prbench/datasets/real-cases/2.0.0 --from cases-local --splits datasets/real-cases-3.0.0.draft.json`. The expansion entries in `datasets/expansion/candidates.json` carry the same splits.

## Privacy

Session logs contain prompts, file contents and command output. Before adding a real case:

- Get the session owner's consent.
- Redact secrets, tokens, personal data and unrelated work.
- Don't commit real cases. Keep them in `cases-local/` or another private location.

Public redistribution additionally requires owner consent, a review of embedded
file contents and command output, and a versioned dataset card and license.
`scripts/package-dataset.ts` requires an ignored publication record with hashes
of the reviewed case and shared inputs. It validates source-bound fact provenance
and copies only declared case files, pinned fixtures and release documentation.

## Fact provenance for comparisons

Real comparison cases require `facts-provenance.json` with schema
`prbench.fact-provenance/v1`, the exact `factsSha256`, a genuine `reviewedBy` and
`reviewedAt`, and an entry for each C/X/U/T fact ID. Each entry has a rationale and
one or more hashed, one-based line ranges. Source kinds are pinned `git` files,
`diff`, attributed `commit` metadata, declared `session` files, or a wrapped
`historical-digest`. Mark an automated review as `reviewKind: "automated"`; do not
imply human adjudication.

A historical digest must live at `fact-sources/digest.json`, identify the same
case/base/head and hash its original packet, using schema
`prbench.historical-digest/v1`. Preflight checks its source commit refs and range
hashes. Its extractor observations retain their own limitations. It is not a new
execution attestation. These judge-side artifacts are never writer inputs. Keep
facts unchanged unless source evidence justifies a separately documented correction.
