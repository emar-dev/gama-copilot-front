# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two primary audiences, weighted equally (confirmed):

- **Students and newcomers to GAMA**: discovering agent-based modelling and the GAML language. They need guidance, explanations of what the generated code does, and answers to "how do I…" questions about the platform.
- **Researchers and experienced modellers**: already fluent in GAMA. They use the copilot to go faster: drafting species, behaviours and experiments, fixing models, iterating.

The same interface must serve both: explanation available on demand for the first group, no friction or hand-holding forced on the second.

## Product Purpose

GAMA-Copilot is an AI assistant for GAMA Platform. A user describes the system they want to study in natural language; the copilot writes the multi-agent model in GAML, checks it, and answers questions about the platform. Success means a user gets from an idea to a model that compiles and runs in GAMA faster, and understands what they got.

## Positioning

- Generated GAML is validated by the real GAMA engine (gama-server) before it is proposed, not just pattern-matched by a language model.
- Questions about GAMA are answered by retrieval over the official GAMA documentation (RAG), not from the model's memory.
- The copilot acts on the user's workspace: it creates the GAMA project structure and writes, reads and updates `.gaml` files through an autonomous agent with tools.

## Operating Context

- **Deployment (confirmed):** a shared, hosted instance (lab or university server) with real user accounts. The login page is a real entry point, not a demo screen.
- **Stack:** Next.js front (`gama-copilot-front`) + NestJS API (`gama-copilot-api`): LangChain agent, Ollama-served local models, gama-server for validation, RAG index built from the GAMA documentation.
- Users ultimately open and run their models in the GAMA desktop application.

## Capabilities and Constraints

Confirmed, implemented in the API:

- `POST /agent`: autonomous agent (ReAct + tools: doc search, GAML generation/validation, project and file operations).
- `GET /ai/generate`: GAML generation; `GET /ai/chat`, `GET /ai`: chat and documentation Q&A.
- `POST /project`, `/project/structure`, `/project/file`, `/project/file/update`, `GET /project/file`: project and file management in a server-side workspace.
- Accounts (MySQL + TypeORM): `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/logout-all`, `GET /auth/me`. JWTs live only in httpOnly cookies backed by server-side sessions; every other API route requires a signed-in user.

Constraints:

- Models run locally through Ollama (default `qwen2.5-coder:7b`). Responses can take several seconds or more; every surface that calls the copilot must handle long waits, partial failure and retry honestly.
- GAML keywords (`species`, `reflex`, `experiment`, `global`, `skills`…) are code and stay untranslated in every language.
- **Languages (confirmed):** interface in French and English; the GAMA documentation itself is in English.

Open decisions (not yet decided, do not invent):

- Whether Google / GitHub sign-in and password reset will exist.
- How users get their generated projects from the shared server into their GAMA desktop (download, sync, shared folder…).
- Per-user isolation of workspaces and conversation history.
- Default interface language, and whether the copilot answers in the user's language or the interface language.

## Brand Commitments

- Name: **GAMA-Copilot**. Built on GAMA Platform (open source); no official affiliation has been confirmed, so none may be claimed.

## Evidence on Hand

- Evaluation and smoke scripts exist in the API (`npm run index:eval`, `gaml:eval`, `agent:eval`, `agent:smoke`, `demo:mvp`), with raw outputs in `gama-copilot-api/smoke-*-out.txt`.
- No user base, testimonials, usage numbers, benchmarks or institutional partners exist yet. Do not fabricate any of them.

## Product Principles

1. **Verified before shown.** Generated code reaches the user only after it has been checked, and the check result is visible.
2. **Grounded, not guessed.** Answers about GAMA come from its documentation; when they cannot, the copilot says so.
3. **Learn or go fast, same tool.** Explanations are one step away for newcomers and never in the way of experts.
4. **The user's model stays the user's.** Every file the copilot creates or changes is visible, readable and theirs to edit.
5. **Honest about the machine.** Local models are slow and fallible; waiting, failures and limits are shown plainly, never hidden behind fake confidence.
