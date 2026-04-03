# UI Redesign: Activity Hub, Initiative Pipeline, Chat & Collab

**Date:** 2026-04-03
**Approach:** Hybrid — Pipeline UI with existing flow internals (Approach C)

## Problem

The current Collaborations page presents 3 first-order options (Initiative, Wish, Agreement) that lead into a flat menu of 12 flow tools across 4 categories. This is overwhelming and obscures the core value proposition: guiding a community from identifying a cross-border problem to forming a democratic mandate. The planning/fundraising tools (added by Ouri) are useful but belong in a separate context, and communication tools should be embedded, not standalone.

## Overview

Three structural changes:

1. **Activity Hub** replaces the Collaborations page as a dashboard with summary cards
2. **Initiative** becomes a guided pipeline (Problem → Discussion → Proposals → Vote → Mandate)
3. **Wish** and **Agreement** are replaced by **Chat** (simple topic-based conversations) and **Collab** (template-based teamwork using Ouri's tools)

The existing blockchain flow components (ApprovalFlow, QVFlow, ConcernsFlow) and local flow components (DiscussionFlow, SchedulingFlow, TaskboardFlow, RolesFlow, FundraisingFlow, BudgetFlow, DocFlow) are reused internally. The pipeline controls which flows appear and when — users no longer pick from a menu.

---

## Section 1: Activity Hub

Replaces the current Collaborations page. Accessible at `/community/:communityId/activity` (renamed from `/collaborations`, remains the default community tab).

### Layout

Three summary cards stacked vertically:

**Initiative card**
- Count of active initiatives
- Most recent initiative with its current pipeline stage (e.g., "Discussion phase — 4 comments")
- "Start Initiative" button
- Taps through to full initiative list

**Collab card**
- Active collabs with template type badge (e.g., "Nairobi Workshop — Event Planning")
- "Start Collab" button
- Taps through to full collab list

**Chat card**
- Most recently active topics (preview of 2-3)
- "New Topic" button
- Taps through to full chat view

### Subtitle

"Solve problems that transcend borders. Start with an initiative, collaborate on projects, or chat with your community."

### Components Replaced

- `Collaborations.tsx` → new `ActivityHub.tsx`
- `CreateCollaborationButtons` → hub cards with inline buttons
- `CollaborationFilterBar` → removed (the three sections ARE the filters)

---

## Section 2: Initiative Pipeline

### Creation Form

Structured inputs replacing the current Title + Description dialog:

- **What's the problem?** — single-line title
- **Why does this matter?** — paragraph field for the cross-border case
- **Evidence** — repeatable URL fields (add-another pattern)
- **Countries affected** — multi-select from existing country list (Kenya, Nigeria, Malawi, DR Congo, Other)

Intro text above the form: "Describe a problem that affects people across borders. Your community will work together through discussion, proposals, and voting to reach a shared mandate."

The countries field serves dual purpose: demonstrates cross-border relevance and feeds into country-segmented voting results already built into ApprovalFlow and QVFlow.

### Pipeline Stages

A progress bar at the top of the initiative page showing five stages:

#### 1. Problem Definition
- Displays the submitted problem, evidence links, and countries affected
- Onboarding text: "Review the evidence. Does this problem truly cross borders?"
- Read-only — the initial submission

#### 2. Discussion
- Reuses the Chat message stream component (flat, not threaded) rather than the existing threaded DiscussionFlow
- Onboarding text: "Share perspectives. What does this look like in your country?"
- Messages show CountryBadge for each participant

#### 3. Proposals
- ApprovalFlow activates — community members submit proposed solutions
- Approve/unapprove toggle on each proposal
- Onboarding text: "Suggest solutions. What should be done about this?"
- Country-segmented approval results visible

#### 4. Vote
- QVFlow activates for the top proposals
- Credit allocation via sliders, votes = sqrt(credits)
- Onboarding text: "Allocate your voting credits to the proposals you support most."
- Country breakdown in results

#### 5. Mandate
- Final results displayed
- Onboarding text: "The community has spoken. This is your shared position."
- The winning proposal is the community's mandate on this issue

### Pipeline Behavior

- **Only the current stage is active/prominent.** Previous stages remain visible but collapsed/read-only.
- **Stage advancement is manual.** The initiative creator clicks "Move to next stage" with confirmation. No auto-advancement.
- **The "Add" menu goes away for initiatives.** The pipeline decides what's available — no user-chosen tabs.
- **ConcernsFlow is available as a sidebar action** at any stage. Raising a concern pauses progression until resolved.
- **Under the hood:** Each stage maps to existing flow components. CollaborationPage's tab system still manages them, but tabs are fixed by the pipeline, not user-chosen. A new `PipelineView` wrapper controls which tabs exist and renders the progress bar.

### Data Model

- Pipeline stage stored on the initiative contract via new `set_stage` / `get_stage` methods
- Stage is a string enum: `'problem' | 'discussion' | 'proposals' | 'vote' | 'mandate'`
- Initiative creation form data stored via existing `set_details` (extended with `evidence` and `countries` fields)

---

## Section 3: Chat (replaces Wish)

Simple two-level structure for casual community conversation.

### Topic List View

- Flat list sorted by most recent activity (active topics at top)
- Each entry: topic title, author with CountryBadge, last message preview, message count, time of last activity
- "New Topic" button at top — just a title field, no description required
- Subtitle: "Open conversations about anything in your community."

### Topic View

- Flat message stream (not threaded)
- Messages show author, CountryBadge, timestamp, text content
- Input bar at bottom
- New messages at bottom, scroll up for history

### Escalation

- "Escalate to Initiative" button on any topic
- Pre-fills a new Initiative form with the topic title and a link back to the chat
- Bridges casual conversation to formal deliberation

### Data Model

- Local in-memory Maps keyed by `communityId`, same pattern as existing local flows
- No blockchain storage — chat is ephemeral/lightweight
- Topics: `Map<communityId, Topic[]>` where Topic has `id, title, author, createdAt, lastActivity`
- Messages: `Map<topicId, Message[]>` where Message has `id, author, text, timestamp`

---

## Section 4: Collab (replaces Propose Agreement)

Practical workspace for teamwork using Ouri's existing flow components.

### Creation Flow

1. User clicks "Start Collab"
2. Enters a name (e.g., "Nairobi Workshop Planning")
3. Picks a template:

| Template | Auto-created tabs |
|----------|-------------------|
| **Plan an Event** | Scheduling + Task Board + Roles |
| **Run a Project** | Task Board + Document + Roles |
| **Fundraise** | Fundraising + Budget Allocation |
| **Custom** | Empty — add tools manually |

The Custom option shows the Add menu scoped to Ouri's tools only: Scheduling, Task Board, Roles, Fundraising, Budget, Document.

### Collab Page

- Lands in the tab-based view with template tabs already open
- Tabs can still be added/removed manually (existing CollaborationPage behavior)
- No pipeline, no stages — just the practical tools

### Collab List View

- Each collab shows: name, template type badge, member count, last activity
- Subtitle: "Practical tools for getting things done together."

### Data Model

- Template choice determines initial tabs — no new contract method needed
- Tab persistence via existing localStorage mechanism
- Collaboration stored on community contract with `type: 'collab'`

---

## Section 5: Routing Changes

### Updated Routes

```
/community/:communityId/activity          (renamed from /collaborations, default)
/community/:communityId/chat              (new — topic list)
/community/:communityId/chat/:topicId     (new — message stream)
/community/:communityId/collab            (new — collab list)
```

Initiative, Wish (legacy), and Agreement detail routes remain unchanged. Initiative detail pages now render PipelineView instead of free-form tabs.

### CommunityView Tab Rename

"Collaborations" tab → "Activity" tab

---

## Section 6: Components Summary

### New Components
- `ActivityHub.tsx` — hub page with three summary cards
- `PipelineView.tsx` — wraps CollaborationPage for initiatives, controls stage progression and progress bar
- `CreateInitiativeDialog.tsx` — structured form (problem, evidence, countries)
- `CreateCollabDialog.tsx` — name + template picker
- `ChatTopicList.tsx` — topic list view
- `ChatTopic.tsx` — flat message stream
- Collab templates config (maps template names to flow IDs)

### Modified Components
- `CommunityView.tsx` — rename tab, update default route
- `CollaborationPage.tsx` — accept pipeline mode where tabs are externally controlled
- `App.tsx` — add chat routes
- `initiative_contract.py` — add `set_stage`/`get_stage` methods, extend `set_details` for evidence/countries

### Removed Components
- `CreateCollaborationButtons.tsx`
- `CollaborationFilterBar.tsx`
- The 4-category flow group menu from initiative context (kept only in Collab's Custom mode)

### Unchanged Components
- All flow components (ApprovalFlow, QVFlow, ConcernsFlow, DiscussionFlow, SchedulingFlow, TaskboardFlow, RolesFlow, FundraisingFlow, BudgetFlow, DocFlow)
- Flow registry (still used by Collab's tab system)
- All blockchain contract interactions except initiative stage
