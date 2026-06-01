---
name: next-session-prompt
description: Produces a single copy-pasteable markdown code block for continuing work in a new agent session. Use only when the user attaches @next-session-prompt.
disable-model-invocation: true
---

# Next Session Prompt

## Invocation

Runs **only** when the user attaches **`@next-session-prompt`**. No trigger phrases. Do not infer this skill from casual chat.

When attached, the checkout prompt is the **primary deliverable**. Do not execute the prompt — only write it.

If the user's message adds focus or constraints (e.g. "emphasize blockers"), apply them **inside** the block. Do not drop the required output format.

## Output contract (non-negotiable)

The user must receive **one** fenced `markdown` code block with a copy button. Get the format right on the first response. Do not ask the user to re-prompt, repeat a phrase, or fix formatting.

**Required response shape:**

1. Optional preamble and/or postamble — commentary only (e.g. "Paste into your next agent:"). Max ~2 short sentences **combined** outside the block.
2. **Exactly one** code fence labeled `markdown` containing the **entire** continuation prompt.
3. All information the next agent needs must be **inside** the block. Nothing important may live only in preamble/postamble.

**Forbidden:**

- Handoff text in plain prose (no copy button)
- Multiple code blocks
- Telling the user to ask again or fix formatting
- Truncated prompts (`...`, "see above", "as discussed")
- Important context, file paths, or next steps only outside the block
- Nested triple-backtick fences inside the prompt (use indentation or spell out backticks)
- Executing the handoff prompt in this session

## Prompt content (inside the block)

Write a **self-contained** prompt a cold agent can execute without this chat.

**Core sections** — use these headings; skip a section when it would be empty:

| Section | Content |
|---------|---------|
| **Goal** | One sentence: what the next session should accomplish |
| **Context** | Repo/path, branch, relevant docs or skills |
| **Done** | Concrete completed items from this session |
| **Next steps** | Ordered next steps (numbered) |
| **Constraints** | Rules, locked decisions, things not to do |
| **Verify** | Commands or checks to run when done |

**Optional sections** — add only when they help the next session:

| Section | Include when… |
|---------|----------------|
| **Blockers / open questions** | Something failed, is blocked, or needs a decision |
| **Files touched** | Specific paths would save the next agent time |
| **Attach in next session** | @skills, @rules, or @docs would help |
| **Git state** | Branch, uncommitted work, or commit/push expectations matter |

Prefer paths and file names over vague references ("the file we edited").

## Workflow

1. Scan the conversation for goal, progress, blockers, and constraints.
2. Draft the continuation prompt using the sections above.
3. Put the **full draft** inside a single ` ```markdown ` block.
4. **Self-check before sending** (mandatory — do not skip):
   - [ ] Exactly one `markdown` fenced block
   - [ ] Block is complete (not truncated)
   - [ ] No nested ``` inside the block
   - [ ] All handoff context is inside the block
   - [ ] Prompt stands alone without "as discussed above"
5. If any check fails, fix the draft before responding. Never send a non-compliant response.

## Examples

See [examples.md](examples.md) for good vs bad output.
