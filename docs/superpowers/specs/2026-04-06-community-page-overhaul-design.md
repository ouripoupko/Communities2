# Community Page & Navigation Overhaul — Design Spec

**Date:** 2026-04-06
**Author:** Claude (autonomous design session with Eston)
**Branch:** `eston/dev`

---

## Overview

A set of structural and UX changes to the community page, communities list, initiative creation, community creation, identity management, and the global header. The guiding principle across all changes is **more titles, descriptions, and tutorial language** — helping users understand what they're looking at and what they can do at every point.

---

## 1. Remove Horizontal Tab Bar from Community Page

**File:** `src/pages/CommunityView.tsx`, `src/pages/CommunityView.module.scss`

### Current State
The community page has both a slide-out hamburger menu (triggered by button next to community name) AND a horizontal inline tab bar below the header with tabs: Collab, Chat, Currency, Members. These are redundant — the slide-out menu already contains all these options.

### Change
- Remove the `.inlineNav` section entirely from `CommunityView.tsx`
- Remove all `.inlineNav`, `.navTab`, `.navTabActive` styles from `CommunityView.module.scss`
- The community page now shows the **dark header** (community name, description, member count) directly above the **activity feed**
- All sub-page navigation (Collab, Chat, Currency, Members, Identity) is exclusively through the slide-out menu

### Activity Feed Enhancements
Add a section header above the feed cards:
- **Title:** "Community Activity"
- **Description:** "Recent initiatives and updates from this community. Tap an initiative to see its progress through the governance pipeline."
- Style: `$text-lg` semibold for title, `$text-sm` `$gray-500` for description, `$spacing-lg` padding

---

## 2. Updated Slide-Out Menu Structure

**File:** `src/pages/CommunityView.tsx`

### Current Menu Items
```
[Community Name]
────────────────
Home
────────────────
Collab
Chat
Currency
Members
────────────────
Share Community Link
Invite Members
Leave Community
```

### New Menu Items
```
[Community Name]
────────────────
Home
Create Initiative    ← NEW (prominent placement)
────────────────
Collab
Chat
Currency
Members
Identity & Trust     ← NEW (moved from Members page)
────────────────
Share Community Link
Invite Members
Leave Community
```

### Details
- **Create Initiative**: Uses `PlusCircle` icon from lucide-react. Navigates to `/community/:communityId/create-initiative`. Placed directly under Home because it's the primary action users should be aware of.
- **Identity & Trust**: Uses `Shield` icon from lucide-react. Navigates to `/community/:communityId/identity`. Placed after Members since it's related but distinct.
- All other items unchanged.

---

## 3. Create Initiative — Full Onboarding Page

**New files:**
- `src/pages/CreateInitiativePage.tsx`
- `src/pages/CreateInitiativePage.module.scss`

**Route:** `/community/:communityId/create-initiative` (added to CommunityView's nested `<Routes>` block — CommunityView already uses a `/*` catch-all in App.tsx)

### Purpose
Replace the current `CreateInitiativeDialog.tsx` modal with a full-page scrolling experience that educates users before they submit. The goal is to reduce low-quality initiatives by ensuring users understand the governance process they're triggering.

### Page Structure

#### Header
- Back button (arrow-left) → returns to community page
- Page title: "Start an Initiative"

#### Section 1: What is an Initiative?
> An initiative is a problem you want your community to solve together. When you start an initiative, you're asking your community to recognize a problem, discuss solutions, propose actions, and vote on how to move forward.
>
> Think of it as a formal request for collective action — backed by a transparent, democratic process.

Style: White card with `$spacing-xl` padding. Body text `$text-sm`, `$gray-700`.

#### Section 2: The 5 Stages

A visual vertical stepper showing each stage with icon, name, and plain-language explanation:

1. **Problem Recognition** (red, `AlertTriangle` icon)
   - "Your community votes on whether this is a real problem. At least 67% of voters must agree it's worth addressing before it moves forward."

2. **Discussion** (amber, `MessageSquare` icon)
   - "Community members discuss the problem openly. At least 33% of members must participate in the conversation. Members can also suggest modifications to the initiative's framing."

3. **Proposals** (purple, `FileText` icon)
   - "Members submit concrete proposals for how to solve the problem. The community reviews and approves proposals. Modifications can still be suggested at this stage."

4. **Vote** (blue, `Vote` icon)
   - "The community votes on approved proposals using quadratic voting — a system where you spread credits across proposals you care about. This prevents any single voter from dominating the outcome."

5. **Mandate** (green, `ScrollText` icon)
   - "The winning proposal becomes a mandate. Community members can pledge to support its implementation. This is the community's commitment to action."

Style: Each step is a row with a colored circle (stage color), icon, stage name (`$text-sm` semibold), and description (`$text-xs` `$gray-600`). Vertical connecting line between circles (2px, `$gray-200`).

#### Section 3: What Makes a Good Initiative?

> **Be specific.** "Climate change is bad" won't get traction. "Our neighbourhood lacks recycling infrastructure" will.
>
> **Explain why it matters.** Help your community understand the impact. Who is affected? What happens if nothing changes?
>
> **Provide evidence.** Link to articles, reports, data, or personal accounts that support your case. Evidence builds trust and accelerates consensus.
>
> **Think locally.** The best initiatives are ones your community can actually act on.

Style: White card, bullet-style layout with bold lead phrases and regular body text.

#### Section 4: The Form

Fields (matching current dialog but with more space and inline help):

1. **"What's the problem?"** (required)
   - Input type: text
   - Placeholder: "Describe the problem in one clear sentence"
   - Help text below: "Be specific and actionable. This becomes the initiative's title."

2. **"Why does this matter?"** (required)
   - Input type: textarea (6 rows, more room than current 4)
   - Placeholder: "Explain the impact and why your community should care"
   - Help text below: "This is your case for action. Be persuasive but honest."

3. **"Supporting evidence"** (optional, expandable)
   - Same URL list as current dialog (add/remove links)
   - Help text: "Links to articles, reports, or data that back up your case."
   - Note: Currently these are collected but NOT persisted to the contract. This spec preserves current behavior — persisting evidence is a separate contract change.

4. **"Countries affected"** (optional)
   - Same chip selector as current dialog (Kenya, Nigeria, Malawi, DR Congo, Other)
   - Help text: "Select which countries are most affected by this problem."
   - Note: Same as evidence — collected but not yet persisted. Preserved as-is.

5. **Submit button**: "Start Initiative" (primary style, full-width on mobile)
   - Loading state: "Submitting..." with disabled form
   - Error state: Red message below button

#### Section 5: After submission
- On success, navigate to the community activity feed
- Show a brief success toast or inline message: "Your initiative has been created. It starts at the Problem Recognition stage."

### Migration
- `CreateInitiativeDialog.tsx` is no longer used — it can be removed or kept as dead code for now
- All trigger points (ActivityHub.tsx "Start Initiative" button, InitiativeList.tsx) should navigate to this new page instead of opening the dialog
- The slide-out menu item is the primary entry point

---

## 4. Create Community — Full Onboarding Page

**New files:**
- `src/pages/CreateCommunityPage.tsx`
- `src/pages/CreateCommunityPage.module.scss`

**Route:** `/create-community` (new top-level route in App.tsx)

### Purpose
Replace the current `CreateCommunityDialog.tsx` modal with a full-page experience that explains what communities are and why users should create one before asking for input.

### Page Structure

#### Header
- Back button → returns to `/identity/communities`
- Page title: "Create a Community"

#### Section 1: What is a Community on Gloki?
> A community is a group of people united by a shared interest, location, cause, or goal. On Gloki, communities are spaces for collective decision-making — where members can identify problems, propose solutions, and vote on actions together.
>
> Every community on Gloki has access to the same democratic tools: a 5-stage governance pipeline, community currency, collaboration workspaces, and identity verification.

#### Section 2: Why Create a Community?
> **Bring direct democracy to your group.** Whether you're a neighbourhood association, a student union, a workplace team, or an activist collective — Gloki gives your group the tools to make decisions transparently and fairly.
>
> **Every voice counts.** Quadratic voting ensures no single person dominates the outcome. Thresholds ensure decisions have genuine community support before moving forward.
>
> **From problems to mandates.** Don't just talk about issues — turn them into commitments. Gloki's pipeline moves problems through discussion, proposals, and voting into mandates your community can act on.

#### Section 3: What Gloki Provides Your Community
A list of capabilities, each with icon and brief explanation:

- **Governance Pipeline** (`GitBranch` icon) — 5-stage democratic process from problem recognition to mandated action
- **Community Currency** (`Coins` icon) — Mint, send, and manage a currency owned by your community
- **Collaboration Tools** (`Users2` icon) — Shared workspaces for documents, tasks, scheduling, and roles
- **Identity & Trust** (`Shield` icon) — Verify members through a web of trust, QR-based identity cards
- **AI Translation** (`Globe` icon) — Automatic translation across 12 languages so everyone can participate

#### Section 4: What We Need From You

> To create a community, we just need two things:
>
> **A name** — What should your community be called? Keep it clear and recognizable.
>
> **A description** — What is this community about? Help potential members understand what they're joining and what you're trying to achieve together.

#### Section 5: The Form

1. **"Community name"** (required)
   - Input type: text
   - Placeholder: "e.g. Berlin Climate Action Network"
   - Help text: "This is how your community appears to other Gloki users."

2. **"Description"** (optional but encouraged)
   - Input type: textarea (4 rows)
   - Placeholder: "What is this community about? What are you trying to achieve?"
   - Help text: "A good description helps attract the right members."

3. **Submit button**: "Create Community" (primary style, full-width on mobile)
   - Loading state: "Creating..." with disabled form
   - Error state: Red message below button

#### After Submission
- On success, navigate to the new community page (`/community/:newCommunityId`)
- The creator is automatically the first member (current behavior preserved)

### Migration
- `CreateCommunityDialog.tsx` is no longer used
- `HomepageMenu.tsx` "Create Community" menu item navigates to `/create-community` instead of triggering the dialog
- `Communities.tsx` can add a visible "Create a community" card or button that also navigates to this page

---

## 5. Identity & Trust — Separated from Members

**New files:**
- `src/components/community/IdentityTrust.tsx`
- `src/components/community/IdentityTrust.module.scss`

**Route:** `/community/:communityId/identity` (added to CommunityView's nested routes)

### Current State
The Members page (`src/components/community/Members.tsx`) contains an "Identity & Trust" section at the top with three action buttons (My ID Card, Scan Member, Share), plus the members list below. These are two distinct concerns.

### Change

**New IdentityTrust page** contains:
- **Page title:** "Identity & Trust"
- **Description:** "Gloki uses a web of trust to verify community members. By scanning each other's QR codes and confirming real-world identity, you strengthen the trust network within your community. The more verified connections you have, the stronger your community's democratic foundation."
- **Action buttons** (moved from Members):
  - My ID Card (`IdCard` icon)
  - Scan Member (`QrCode` icon)
  - Share Identity (`Share2` icon)
- Same functionality and styling as current, but with more surrounding context

**Modified Members page:**
- Remove the Identity & Trust section entirely
- Add a page title: "Members"
- Add description: "People in this community. Members can propose initiatives, vote on decisions, and participate in governance."
- Keep: member list, approval buttons, join button for non-members

---

## 6. Communities List — Titles, Descriptions, and Icon Fix

**File:** `src/components/identity/Communities.tsx`, `src/components/identity/Communities.module.scss`

### Add Page Header Content
- **Title:** "Your Communities"
- **Description:** "Communities you've joined on Gloki. Star your favourites to keep them at the top, or hide ones you don't need right now."

Style: Title uses `$text-xl` semibold, description uses `$text-sm` `$gray-500`, both with `$spacing-xl` horizontal padding, `$spacing-lg` bottom margin.

### Fix Star/Hide Button Contrast
Current: `$gray-50` background (#f8fafc) on white card — nearly invisible.

New styling:
- **Default state:** `$gray-200` background (#e2e8f0), `$gray-500` icon color, 1px `$gray-300` border
- **Hover state:** `$gray-300` background, `$gray-700` icon color
- **Star active state:** `$warning` (#f59e0b) background with white icon (current amber color preserved but made more visible)
- Size remains 32px (meets touch targets when combined with padding)

### Add "Create a Community" Entry Point
Below the community list (or in the empty state), add a card or button:
- Text: "Create a community" with `PlusCircle` icon
- Navigates to `/create-community`
- Style: Dashed border card with `$gray-400` text, full width, centered content

---

## 7. EarthFlag Logo — Bigger in Header

**File:** `src/components/PageHeader.tsx`, `src/components/PageHeader.module.scss`

### Change
- Increase EarthFlag SVG from **32px** to **40px** (both width and height) in the homepage header variant
- This gives the flower-of-life pattern enough room to clearly see the spaces between the interlocking circles
- The "Gloki" text size stays at `$text-2xl` — the logo grows but the wordmark stays proportional

---

## 8. Light/Dark Mode — NOT in Scope

The SCSS already has `$dark-*` tokens and some `@media (prefers-color-scheme: dark)` rules scattered across components. However, full theming is a large separate effort involving:
- Consistent token usage across all components
- Toggle UI element
- Persistent preference storage
- Testing across all pages

The icon contrast fix in item 6 addresses the immediate readability concern. Full dark/light mode theming should be its own project after these structural changes are stable.

---

## 9. Cross-Cutting: Tutorial Language Everywhere

This is not a single task but a principle applied across all changes above and to existing pages that currently lack context. Every page should have:

1. **A clear title** — What page am I on?
2. **A brief description** — What can I do here? Why does this matter?
3. **Inline help text on forms** — What should I put in this field?

Pages getting new or improved titles/descriptions:

| Page | Title | Description |
|------|-------|-------------|
| Community Activity Feed | "Community Activity" | "Recent initiatives and updates from this community..." |
| Create Initiative | "Start an Initiative" | (full tutorial sections, see §3) |
| Create Community | "Create a Community" | (full tutorial sections, see §4) |
| Identity & Trust | "Identity & Trust" | "Gloki uses a web of trust to verify community members..." |
| Members | "Members" | "People in this community. Members can propose initiatives..." |
| Communities List | "Your Communities" | "Communities you've joined on Gloki..." |

---

## Route Changes Summary

### New Routes
| Route | Component | Access |
|-------|-----------|--------|
| `/community/:communityId/create-initiative` | `CreateInitiativePage` | Slide-out menu, ActivityHub button, InitiativeList button |
| `/community/:communityId/identity` | `IdentityTrust` | Slide-out menu |
| `/create-community` | `CreateCommunityPage` | HomepageMenu, Communities list |

### Removed UI
| Element | Location | Reason |
|---------|----------|--------|
| Horizontal tab bar (`.inlineNav`) | CommunityView | Redundant with slide-out menu |
| Identity & Trust section | Members.tsx | Moved to dedicated page |
| CreateInitiativeDialog | ActivityHub, InitiativeList | Replaced by full page |
| CreateCommunityDialog | HomepageMenu, Communities | Replaced by full page |

### Unchanged Routes
All existing routes remain. No URLs change. The new pages are additive.

---

## Files to Create
1. `src/pages/CreateInitiativePage.tsx`
2. `src/pages/CreateInitiativePage.module.scss`
3. `src/pages/CreateCommunityPage.tsx`
4. `src/pages/CreateCommunityPage.module.scss`
5. `src/components/community/IdentityTrust.tsx`
6. `src/components/community/IdentityTrust.module.scss`

## Files to Modify
1. `src/App.tsx` — add `/create-community` top-level route only
2. `src/pages/CommunityView.tsx` — remove tab bar, update menu items, add nested routes for identity and create-initiative
3. `src/pages/CommunityView.module.scss` — remove tab bar styles
4. `src/components/community/Members.tsx` — remove Identity section, add title/description
5. `src/components/community/ActivityHub.tsx` — navigate to page instead of opening dialog
6. `src/components/community/InitiativeList.tsx` — navigate to page instead of opening dialog
7. `src/components/identity/Communities.tsx` — add title, description, create button, fix icons
8. `src/components/identity/Communities.module.scss` — fix star/hide button contrast, add title styles
9. `src/components/identity/HomepageMenu.tsx` — navigate to /create-community instead of opening dialog
10. `src/components/PageHeader.tsx` — increase EarthFlag to 40px
11. `src/components/PageHeader.module.scss` — update logo size if CSS-driven

## Files to Potentially Remove (or Leave as Dead Code)
1. `src/components/community/dialogs/CreateInitiativeDialog.tsx`
2. `src/components/identity/communities/CreateCommunityDialog.tsx`

---

## Technical Notes

- **Evidence and countries fields**: The current CreateInitiativeDialog collects evidence URLs and countries but does NOT persist them to the blockchain contract. The new page preserves this same behavior — the fields are shown to set user expectations, but the actual persistence requires a contract change that is out of scope.
- **Contract interaction**: The create initiative page uses the same `createInitiative()` service function from `src/services/contracts/community.ts`. No contract changes needed.
- **Create community**: Uses the same `createCommunity()` service function. No contract changes needed.
- **Collab**: Left completely as-is per user instruction. No changes.
- **Chat, Currency, Pipeline stages, Stage Feed**: All untouched.
