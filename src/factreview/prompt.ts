// Prompts for the fact-review panel. They are blind: nothing says who or what
// wrote the sheet, and nothing suggests it is probably right. Changing what a
// prompt asks for changes every resume key (the prompt text is hashed), so
// bump FACT_REVIEW_PROMPT_VERSION with any change in meaning.
import type { Proposal, SheetItem } from "./schema.ts";

export const FACT_REVIEW_PROMPT_VERSION = 2;

const WORKSPACE = `## Your workspace

Your working directory holds the evidence for one code change. You can read and search it; you cannot change it.

- README.md: the base and head commits and what each file is
- diff.patch: the whole change (git diff base..head); diffstat.txt: its summary
- commits/<sha>.txt: each commit's metadata and message
- <session>.md: a readable index of each recorded agent session; every entry starts with the line (L<n>) it came from in the raw transcript
- raw/<session file>: the raw session transcripts (JSONL)
- base/<path>, head/<path>: every changed file as it was before and after the change
- fact-sources/<file> (when present): source documents the case's facts were built from, such as a recorded digest of the agent sessions; facts may rest on them as well as on the diff and sessions
- repo.git: a bare clone of the repository (use it if you can run git)
- sheet.json: the fact sheet under review

Cite evidence with these references, one location each:
- \`diff.patch:L120-L140\`
- \`commits/<sha>.txt:L1-L12\`
- \`head/<path>:L5-L9\` or \`base/<path>:L5-L9\`
- \`raw/<session file>:L23-L40\` (raw transcript lines; use the L<n> numbers from the session index)
- \`fact-sources/<file>:L10-L20\` (line ranges of the file as stored)

Read the evidence yourself. Check facts against what the diff and sessions show, not against what seems plausible.`;

const SHEET_RULES = `## What a fact sheet is

A fact sheet is the reference that pull-request descriptions of this change are scored against. It has four sections:
- claims: things a good description should convey, each checkable against the diff or sessions;
- context: background a reviewer would want (why, prior behaviour, constraints);
- uncertainties: what the evidence does not establish (e.g. tests not run), so a description must not overclaim it;
- traps: plausible but wrong statements a writer might make. A trap is good when it is tempting AND false.

A wrong, unsupported, trivial or missing fact biases every score, so be exact.`;

const list = (items: SheetItem[]) =>
  items.map((i) => `- ${i.id} (${i.category}): ${i.text}`).join("\n");

export function reviewPrompt(sheet: SheetItem[]): string {
  return `You are reviewing a fact sheet for a code change, item by item, against the raw evidence.

${SHEET_RULES}

${WORKSPACE}

## The sheet (also in sheet.json)

${list(sheet)}

## Your task

For every item, give exactly one verdict:
- keep: supported by the evidence, correct, specific and worth scoring;
- revise: worth keeping but inaccurate, overstated, vague or wrongly scoped; give the corrected text in "rewrite";
- remove: unsupported, contradicted, trivial, or a duplicate of another item.

For each item also give a one-line reason and the evidence references you checked. Set "rewrite" to null unless you revise.
For traps, set "trapIsReal": true only if the statement is a real temptation for someone describing this change AND is false according to the evidence; otherwise false (and revise or remove it). For other sections set it to null.

Then list important facts the sheet is missing, under "additions", each with its section, the text as it should appear on the sheet, a one-line reason and evidence references. Propose only facts that matter for judging a description of this change; return an empty list if nothing important is missing.

Reply with the JSON object only.`;
}

export interface RewriteInput {
  id: string;
  category: string;
  original: string;
  rewrites: { text: string; reason: string; evidenceRefs: string[] }[];
  /** From earlier rounds: the candidate that was put to the vote and why reviewers rejected it. */
  previous?: { text: string; objections: string[] };
}

export function rewritePrompt(inputs: RewriteInput[]): string {
  const body = inputs
    .map((r) =>
      [
        `### ${r.id} (${r.category})`,
        `Current text: ${r.original}`,
        ...r.rewrites.map(
          (w, i) =>
            `Proposed rewrite ${i + 1}: ${w.text}\n  reason: ${w.reason}\n  evidence: ${w.evidenceRefs.join(", ") || "none"}`,
        ),
        ...(r.previous
          ? [
              `Candidate rejected in the last vote: ${r.previous.text}`,
              ...r.previous.objections.map((o) => `  objection: ${o}`),
            ]
          : []),
      ].join("\n"),
    )
    .join("\n\n");
  return `Several independent reviewers agreed that some items on a fact sheet need rewriting, and proposed rewrites. Merge each item's proposals into one candidate text.

${SHEET_RULES}

${WORKSPACE}

The items and proposals are below and in proposals.json.

${body}

## Your task

For every item, write one candidate that keeps what the proposals agree on, is supported by the evidence (check it), and fixes every objection. Do not add claims none of the proposals or the evidence support. Give a one-line reason and the evidence references the candidate rests on.

Reply with the JSON object only.`;
}

export interface ClusterInput {
  id: string;
  category: string;
  text: string;
  reason: string;
  evidenceRefs: string[];
}

export function clusterPrompt(
  sheet: SheetItem[],
  additions: ClusterInput[],
): string {
  const body = additions
    .map(
      (a) =>
        `- ${a.id} (${a.category}): ${a.text}\n  reason: ${a.reason}\n  evidence: ${a.evidenceRefs.join(", ") || "none"}`,
    )
    .join("\n");
  return `Independent reviewers proposed facts that a fact sheet is missing. Group proposals that state the same fact.

${SHEET_RULES}

${WORKSPACE}

## The sheet (also in sheet.json)

${list(sheet)}

## Proposed additions (also in proposals.json)

${body}

## Your task

Put every proposal in exactly one cluster: proposals stating the same fact go together, anything else stands alone. For each cluster, write the single text the sheet should carry (checked against the evidence), choose its section, and give the evidence references it rests on.

Reply with the JSON object only.`;
}

export function votePrompt(sheet: SheetItem[], proposals: Proposal[]): string {
  const body = proposals
    .map((p) =>
      p.kind === "revise"
        ? `- ${p.id}: replace ${p.id.slice(2)} (${p.category})\n  from: ${p.original}\n  to:   ${p.text}\n  evidence: ${p.evidenceRefs.join(", ") || "none"}`
        : `- ${p.id}: add to ${p.category}: ${p.text}\n  evidence: ${p.evidenceRefs.join(", ") || "none"}`,
    )
    .join("\n");
  return `You are voting on proposed changes to a fact sheet for a code change.

${SHEET_RULES}

${WORKSPACE}

## The current sheet (also in sheet.json)

${list(sheet)}

## Proposed changes (also in proposals.json)

${body}

## Your task

Check each change against the evidence. Vote accept only if the resulting fact is correct, supported, specific and worth scoring (and, for a trap, tempting and false); otherwise reject. Give a one-line reason and the evidence references you checked for every vote.

Reply with the JSON object only.`;
}

export function correctionPrompt(prompt: string, problems: string[]): string {
  return `${prompt}\n\n## Correction\n\nAn earlier reply to this request was rejected for these problems:\n${problems.map((p) => `- ${p}`).join("\n")}\nReply again with a complete, corrected JSON object.`;
}
