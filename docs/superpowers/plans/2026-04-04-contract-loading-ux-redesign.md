# Contract Loading, UX Redesign & Design System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix contract loading failures, expand country list, establish design system, polish initiative pipeline UX, and redesign homepage around an initiative feed.

**Architecture:** Five sequential phases — contract loading resilience first (unblocks all flows), then design system doc (establishes standards), country expansion (data layer), pipeline UX polish (applies standards), and homepage redesign (largest change). Each phase produces a working commit.

**Tech Stack:** React 19, TypeScript, Redux Toolkit, SCSS Modules, Vite. No test framework — verify via `tsc -b` and `npm run dev` with browser DevTools.

---

## File Structure

### Modified files:
- `src/services/api.ts` — add timeout parameter to `deployContract`
- `src/components/collaboration/flows/shared/useFlowContract.ts` — deploy timeout, cancellation fix, stale recovery, logging
- `src/utils/countries.ts` — full ISO 3166-1 country list, algorithmic colors
- `src/components/identity/Profile.tsx` — searchable country dropdown
- `src/components/collaboration/PipelineView.tsx` — stage progress dots, concerns badge
- `src/components/collaboration/PipelineView.module.scss` — updated stage styling
- `src/components/collaboration/flows/voting/ProblemVoteFlow.tsx` — vote UX polish
- `src/components/collaboration/flows/voting/ProblemVoteFlow.module.scss` — updated styles
- `src/components/collaboration/flows/voting/ApprovalFlow.tsx` — threshold bar, vote status
- `src/components/collaboration/flows/voting/ApprovalFlow.module.scss` — updated styles
- `src/components/collaboration/flows/voting/QVFlow.tsx` — threshold display, vote clarity
- `src/components/collaboration/flows/voting/QVFlow.module.scss` — updated styles
- `src/components/collaboration/flows/concerns/ConcernsFlow.tsx` — collapse resolved
- `src/components/collaboration/flows/concerns/ConcernsFlow.module.scss` — badge, collapse styles
- `src/pages/IdentityView.tsx` — new default route to initiative feed
- `src/components/identity/HomepageMenu.tsx` — add Communities menu item
- `src/components/identity/HomepageMenu.module.scss` — updated styles
- `src/App.tsx` — no changes needed (routing stays the same)

### New files:
- `DESIGN_SYSTEM.md` — design standards reference
- `src/components/shared/SearchableSelect.tsx` — reusable searchable dropdown
- `src/components/shared/SearchableSelect.module.scss` — dropdown styles
- `src/components/identity/InitiativeFeed.tsx` — homepage initiative feed
- `src/components/identity/InitiativeFeed.module.scss` — feed styles

---

## Task 1: Add configurable timeout to deployContract

**Files:**
- Modify: `src/services/api.ts:5-25,74-112`

- [ ] **Step 1: Update fetchWithTimeout to accept custom timeout**

In `src/services/api.ts`, the `fetchWithTimeout` function already accepts a `timeout` parameter with a default of 10000ms. No change needed here.

- [ ] **Step 2: Update deployContract to use 30s timeout**

In `src/services/api.ts`, change the `deployContract` function to pass `30000` as the timeout:

```typescript
// At line 104, change:
return await fetchWithTimeout(
  `${serverUrl}/ibc/app/${publicKey}?action=deploy_contract`,
  {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contractData),
  }
);
// To:
return await fetchWithTimeout(
  `${serverUrl}/ibc/app/${publicKey}?action=deploy_contract`,
  {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contractData),
  },
  30000
);
```

- [ ] **Step 3: Verify build passes**

Run: `cd "/Volumes/2TB Drive/💪Work & Volunteer/🔵 gloki/Gloki Build/Communities2" && npx tsc -b --noEmit`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/services/api.ts
git commit -m "fix: increase deployContract timeout from 10s to 30s"
```

---

## Task 2: Fix useFlowContract — resilient contract loading

**Files:**
- Modify: `src/components/collaboration/flows/shared/useFlowContract.ts`

- [ ] **Step 1: Add deploy timeout, stale recovery, cancellation fix, and diagnostic logging**

Replace the entire contents of `src/components/collaboration/flows/shared/useFlowContract.ts` with:

```typescript
import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../../../../store/hooks';
import { setContract, setDeploying, clearDeploying } from './flowContractsSlice';
import { deployContract, joinContract, contractRead, contractWrite } from '../../../../services/api';
import type { IMethod } from '../../../../services/interfaces';

interface UseFlowContractResult {
  contractId: string | null;
  isReady: boolean;
  isDeploying: boolean;
  hasError: boolean;
  retry: () => void;
}

const DEPLOY_TIMEOUT_MS = 30_000;

export function useFlowContract(
  instanceId: string,
  contractName: string,
  contractFileName: string,
  contractCode: string,
  parentContractId?: string,
  stageKey?: string,
): UseFlowContractResult {
  const dispatch = useAppDispatch();
  const contractId = useAppSelector((s) => s.flowContracts.contracts[instanceId] ?? null);
  const isDeploying = useAppSelector((s) => s.flowContracts.deploying[instanceId] ?? false);
  const serverUrl = useAppSelector((s) => s.user.serverUrl);
  const publicKey = useAppSelector((s) => s.user.publicKey);
  const attempted = useRef(false);
  const failed = useRef(false);
  const [hasError, setHasError] = useState(false);

  const isShared = !!parentContractId && !!stageKey;

  const retry = useCallback(() => {
    failed.current = false;
    attempted.current = false;
    setHasError(false);
  }, []);

  // ── Stale deploying recovery ────────────────────────────────────────────────
  // If Redux says deploying but we haven't attempted in this mount, the flag
  // is stale from a previous session/mount. Clear it so we can retry.
  useEffect(() => {
    if (isDeploying && !attempted.current && !contractId) {
      console.log(`[FlowContract] Clearing stale deploying flag for ${instanceId}`);
      dispatch(clearDeploying({ instanceId }));
    }
  }, [isDeploying, contractId, instanceId, dispatch]);

  // ── Per-user deploy mode ───────────────────────────────────────────────────
  useEffect(() => {
    if (isShared) return;
    if (contractId || isDeploying || attempted.current || failed.current) return;
    if (!serverUrl || !publicKey) return;

    attempted.current = true;
    dispatch(setDeploying({ instanceId }));
    console.log(`[FlowContract] Deploying ${contractName} for ${instanceId}...`);

    // Deploy timeout — force error if promise doesn't settle
    const timeoutId = setTimeout(() => {
      if (!failed.current) {
        console.warn(`[FlowContract] TIMEOUT: Deploy of ${contractName} for ${instanceId} did not complete within ${DEPLOY_TIMEOUT_MS / 1000}s`);
        failed.current = true;
        setHasError(true);
        dispatch(clearDeploying({ instanceId }));
      }
    }, DEPLOY_TIMEOUT_MS);

    deployContract({
      serverUrl,
      publicKey,
      name: `${contractName}_${instanceId}`,
      contract: contractFileName,
      code: contractCode,
    })
      .then((response) => {
        clearTimeout(timeoutId);
        if (failed.current) return; // Timeout already fired
        const id = (response as { id?: string }).id || (response as string);
        console.log(`[FlowContract] Contract ID extracted: ${id}`);
        // Always cache — contract exists on server regardless of component lifecycle
        dispatch(setContract({ instanceId, contractId: id }));
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        if (failed.current) return; // Timeout already fired
        console.error(`[FlowContract] ERROR deploying ${contractName} for ${instanceId}:`, err);
        failed.current = true;
        setHasError(true);
        dispatch(clearDeploying({ instanceId }));
      });

    return () => { clearTimeout(timeoutId); };
  }, [isShared, instanceId, contractId, isDeploying, serverUrl, publicKey, contractName, contractFileName, contractCode, dispatch, hasError]);

  // ── Shared contract mode ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isShared) return;
    if (contractId || isDeploying || attempted.current || failed.current) return;
    if (!serverUrl || !publicKey || !parentContractId) return;

    attempted.current = true;
    dispatch(setDeploying({ instanceId }));
    console.log(`[FlowContract] Setting up shared ${contractName} for ${instanceId} (parent: ${parentContractId}, stage: ${stageKey})...`);

    // Deploy timeout
    const timeoutId = setTimeout(() => {
      if (!failed.current) {
        console.warn(`[FlowContract] TIMEOUT: Shared setup of ${contractName} for ${instanceId} did not complete within ${DEPLOY_TIMEOUT_MS / 1000}s`);
        failed.current = true;
        setHasError(true);
        dispatch(clearDeploying({ instanceId }));
      }
    }, DEPLOY_TIMEOUT_MS);

    (async () => {
      try {
        // Read parent contract details to check for an existing sub-contract
        const details = await contractRead({
          serverUrl,
          publicKey,
          contractId: parentContractId,
          method: { name: 'get_details', values: {} } as IMethod,
        });
        if (failed.current) return; // Timeout already fired

        const stored = details && typeof details === 'object'
          ? (details as Record<string, unknown>)[stageKey!] as
              { contractId: string; address: string; agent: string } | undefined
          : undefined;

        if (stored?.contractId && stored?.address && stored?.agent) {
          console.log(`[FlowContract] Found existing shared contract: ${stored.contractId}`);
          // Sub-contract exists → join it
          try {
            await joinContract({
              serverUrl,
              publicKey,
              address: stored.address,
              agent: stored.agent,
              contract: stored.contractId,
            });
          } catch {
            // May fail if already joined — that's OK
          }
          if (failed.current) return;
          dispatch(setContract({ instanceId, contractId: stored.contractId }));
        } else {
          console.log(`[FlowContract] No shared contract found, deploying new...`);
          // No sub-contract yet → deploy and store info on parent
          const response = await deployContract({
            serverUrl,
            publicKey,
            name: `${contractName}_${instanceId}`,
            contract: contractFileName,
            code: contractCode,
          });
          if (failed.current) return;

          const newId = (response as { id?: string }).id || (response as string);
          console.log(`[FlowContract] Deployed shared contract: ${newId}`);

          // Write the sub-contract info to the parent so other users can join
          const currentDetails = details && typeof details === 'object'
            ? details as Record<string, unknown>
            : {};
          await contractWrite({
            serverUrl,
            publicKey,
            contractId: parentContractId,
            method: {
              name: 'set_details',
              values: {
                details: {
                  ...currentDetails,
                  [stageKey!]: { contractId: newId, address: serverUrl, agent: publicKey },
                },
              },
            } as IMethod,
          });
          if (failed.current) return;
          dispatch(setContract({ instanceId, contractId: newId }));
        }
        clearTimeout(timeoutId);
      } catch (err) {
        clearTimeout(timeoutId);
        if (failed.current) return;
        console.error(`[FlowContract] ERROR setting up shared contract for ${instanceId}:`, err);
        failed.current = true;
        setHasError(true);
        dispatch(clearDeploying({ instanceId }));
      }
    })();

    return () => { clearTimeout(timeoutId); };
  }, [isShared, instanceId, contractId, isDeploying, serverUrl, publicKey, parentContractId, stageKey, contractName, contractFileName, contractCode, dispatch, hasError]);

  return {
    contractId,
    isReady: contractId !== null,
    isDeploying,
    hasError,
    retry,
  };
}
```

- [ ] **Step 2: Verify build passes**

Run: `cd "/Volumes/2TB Drive/💪Work & Volunteer/🔵 gloki/Gloki Build/Communities2" && npx tsc -b --noEmit`
Expected: No type errors.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`
Open browser to a community → Initiative tab → click an initiative.
Open DevTools Console. You should see:
- `[FlowContract] Deploying problem_vote for ...` or `[FlowContract] Setting up shared ...`
- Either a successful contract ID log, or after 30s: `[FlowContract] TIMEOUT: ...` with a visible "Failed to deploy contract" + Retry button in the UI.

- [ ] **Step 4: Commit**

```bash
git add src/components/collaboration/flows/shared/useFlowContract.ts
git commit -m "fix: resilient contract loading with timeout, stale recovery, and diagnostics"
```

---

## Task 3: Create DESIGN_SYSTEM.md

**Files:**
- Create: `DESIGN_SYSTEM.md`

- [ ] **Step 1: Write the design system document**

Create `DESIGN_SYSTEM.md` in the project root:

```markdown
# Gloki Design System

Standards for consistent UI across the app. Reference this when building or modifying components.

## Colors

Use SCSS tokens from `src/styles/variables.scss`. Never hardcode hex values.

| Token | Usage |
|-------|-------|
| `$primary` / `$primary-dark` | Interactive elements: buttons, links, active states |
| `$success` | Positive outcomes, thresholds met, completion |
| `$warning` | Caution states, unresolved concerns, pending actions |
| `$error` | Destructive actions, failures, blocking errors |
| `$gray-*` | Secondary content, borders, disabled states |

**Rule:** If it's not interactive, it's not blue. If it's not an error, it's not red.

## Typography

| Level | Token | Weight | Use |
|-------|-------|--------|-----|
| Page title | `$text-xl` (20px) | `$font-semibold` | Top-level page headings |
| Section header | `$text-lg` (18px) | `$font-medium` | Section dividers within a page |
| Body | `$text-sm` (14px) | `$font-normal` | Default text, form labels |
| Caption | `$text-xs` (12px) | `$font-normal` | Metadata, timestamps, helper text. Use `$gray-400`. |

## Spacing

Use the spacing scale from variables. No ad-hoc pixel values.

| Token | Value | Use |
|-------|-------|-----|
| `$spacing-xs` | 4px | Tight gaps (icon to text) |
| `$spacing-sm` | 8px | Within components (label to input, items in a group) |
| `$spacing-md` | 12px | Comfortable internal padding |
| `$spacing-lg` | 16px | Between sibling components, card padding |
| `$spacing-xl` | 24px | Between sections |
| `$spacing-2xl` | 32px | Major section breaks |

## Components

### Cards
- Padding: `$spacing-lg`
- Border radius: `$radius-lg` (12px)
- Shadow: `$shadow-base`
- Border: 1px solid `$gray-100` (light) / `$dark-border` (dark)
- Hover: `$shadow-md` transition `$transition-base`

### Buttons

| Variant | Background | Text | Border |
|---------|-----------|------|--------|
| Primary | `$primary` | white | none |
| Secondary | transparent | `$primary` | 1px `$primary` |
| Destructive | `$error` | white | none |
| Ghost | transparent | `$gray-600` | none |

Sizes: sm (32px height), md (40px), lg (48px). Border radius: `$radius-md`.

### Form Inputs
- Height: 40px
- Border: 1px solid `$gray-200`
- Border radius: `$radius-md`
- Focus: 2px ring in `$primary` with 2px offset
- Padding: `$spacing-sm` horizontal

### Modals
- Centered overlay with backdrop blur (4px)
- Background: white / `$dark-surface`
- Border radius: `$radius-xl`
- Padding: `$spacing-xl`
- Max width: 480px
- Structure: header (title + close) → body → footer (actions, right-aligned)

### Loading States
- Centered in container
- Spinner + message text in `$gray-400`
- Padding: `$spacing-xl`
- Font size: `$text-sm`

### Error States
- Same container as loading
- Error icon (AlertCircle) in `$error`
- Message text
- Retry button (secondary variant)
- Padding: `$spacing-xl`

### Empty States
- Centered icon (relevant lucide icon) in `$gray-300`, 48px
- Message in `$gray-400`, `$text-sm`
- CTA button (primary, sm) below

## Mobile Patterns

- **Touch targets:** minimum 44x44px (Apple HIG)
- **Primary actions:** bottom-anchored when possible (thumb zone)
- **Content padding:** 16px from screen edges
- **No hover-only interactions:** everything must be tap-accessible
- **Swipe:** only where already implemented (community tabs, pipeline stages). No new swipe gestures.

## Progress Bars

Used in voting flows for threshold visualization:
- Height: 8px
- Border radius: `$radius-full`
- Background: `$gray-100`
- Fill: `$primary` (in progress) or `$success` (threshold met)
- Transition: width `$transition-base`
```

- [ ] **Step 2: Verify no build issues**

Run: `cd "/Volumes/2TB Drive/💪Work & Volunteer/🔵 gloki/Gloki Build/Communities2" && npx tsc -b --noEmit`
Expected: No type errors (this is a markdown file, shouldn't affect build).

- [ ] **Step 3: Commit**

```bash
git add DESIGN_SYSTEM.md
git commit -m "docs: add design system standards reference"
```

---

## Task 4: Expand country list to full ISO 3166-1

**Files:**
- Modify: `src/utils/countries.ts`

- [ ] **Step 1: Replace countries.ts with full country list**

Replace the entire contents of `src/utils/countries.ts`. The file must contain all ~249 ISO 3166-1 countries/territories with code, name, and flag emoji. Each flag emoji is derived from the two-letter country code using regional indicator symbols.

```typescript
export interface CountryInfo {
  code: string;
  name: string;
  flag: string;
}

/** Full ISO 3166-1 country/territory list, sorted alphabetically by name. */
export const COUNTRIES: CountryInfo[] = [
  { code: 'AF', name: 'Afghanistan', flag: '🇦🇫' },
  { code: 'AL', name: 'Albania', flag: '🇦🇱' },
  { code: 'DZ', name: 'Algeria', flag: '🇩🇿' },
  { code: 'AS', name: 'American Samoa', flag: '🇦🇸' },
  { code: 'AD', name: 'Andorra', flag: '🇦🇩' },
  { code: 'AO', name: 'Angola', flag: '🇦🇴' },
  { code: 'AI', name: 'Anguilla', flag: '🇦🇮' },
  { code: 'AG', name: 'Antigua and Barbuda', flag: '🇦🇬' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'AM', name: 'Armenia', flag: '🇦🇲' },
  { code: 'AW', name: 'Aruba', flag: '🇦🇼' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'AZ', name: 'Azerbaijan', flag: '🇦🇿' },
  { code: 'BS', name: 'Bahamas', flag: '🇧🇸' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'BB', name: 'Barbados', flag: '🇧🇧' },
  { code: 'BY', name: 'Belarus', flag: '🇧🇾' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'BZ', name: 'Belize', flag: '🇧🇿' },
  { code: 'BJ', name: 'Benin', flag: '🇧🇯' },
  { code: 'BM', name: 'Bermuda', flag: '🇧🇲' },
  { code: 'BT', name: 'Bhutan', flag: '🇧🇹' },
  { code: 'BO', name: 'Bolivia', flag: '🇧🇴' },
  { code: 'BA', name: 'Bosnia and Herzegovina', flag: '🇧🇦' },
  { code: 'BW', name: 'Botswana', flag: '🇧🇼' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'BN', name: 'Brunei', flag: '🇧🇳' },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫' },
  { code: 'BI', name: 'Burundi', flag: '🇧🇮' },
  { code: 'CV', name: 'Cabo Verde', flag: '🇨🇻' },
  { code: 'KH', name: 'Cambodia', flag: '🇰🇭' },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'KY', name: 'Cayman Islands', flag: '🇰🇾' },
  { code: 'CF', name: 'Central African Republic', flag: '🇨🇫' },
  { code: 'TD', name: 'Chad', flag: '🇹🇩' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'KM', name: 'Comoros', flag: '🇰🇲' },
  { code: 'CG', name: 'Congo', flag: '🇨🇬' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
  { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮' },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷' },
  { code: 'CU', name: 'Cuba', flag: '🇨🇺' },
  { code: 'CW', name: 'Curaçao', flag: '🇨🇼' },
  { code: 'CY', name: 'Cyprus', flag: '🇨🇾' },
  { code: 'CZ', name: 'Czechia', flag: '🇨🇿' },
  { code: 'CD', name: 'DR Congo', flag: '🇨🇩' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'DJ', name: 'Djibouti', flag: '🇩🇯' },
  { code: 'DM', name: 'Dominica', flag: '🇩🇲' },
  { code: 'DO', name: 'Dominican Republic', flag: '🇩🇴' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻' },
  { code: 'GQ', name: 'Equatorial Guinea', flag: '🇬🇶' },
  { code: 'ER', name: 'Eritrea', flag: '🇪🇷' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪' },
  { code: 'SZ', name: 'Eswatini', flag: '🇸🇿' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹' },
  { code: 'FJ', name: 'Fiji', flag: '🇫🇯' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'GA', name: 'Gabon', flag: '🇬🇦' },
  { code: 'GM', name: 'Gambia', flag: '🇬🇲' },
  { code: 'GE', name: 'Georgia', flag: '🇬🇪' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷' },
  { code: 'GD', name: 'Grenada', flag: '🇬🇩' },
  { code: 'GU', name: 'Guam', flag: '🇬🇺' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹' },
  { code: 'GN', name: 'Guinea', flag: '🇬🇳' },
  { code: 'GW', name: 'Guinea-Bissau', flag: '🇬🇼' },
  { code: 'GY', name: 'Guyana', flag: '🇬🇾' },
  { code: 'HT', name: 'Haiti', flag: '🇭🇹' },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺' },
  { code: 'IS', name: 'Iceland', flag: '🇮🇸' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'IR', name: 'Iran', flag: '🇮🇷' },
  { code: 'IQ', name: 'Iraq', flag: '🇮🇶' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'JM', name: 'Jamaica', flag: '🇯🇲' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴' },
  { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'KI', name: 'Kiribati', flag: '🇰🇮' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼' },
  { code: 'KG', name: 'Kyrgyzstan', flag: '🇰🇬' },
  { code: 'LA', name: 'Laos', flag: '🇱🇦' },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻' },
  { code: 'LB', name: 'Lebanon', flag: '🇱🇧' },
  { code: 'LS', name: 'Lesotho', flag: '🇱🇸' },
  { code: 'LR', name: 'Liberia', flag: '🇱🇷' },
  { code: 'LY', name: 'Libya', flag: '🇱🇾' },
  { code: 'LI', name: 'Liechtenstein', flag: '🇱🇮' },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹' },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺' },
  { code: 'MO', name: 'Macao', flag: '🇲🇴' },
  { code: 'MG', name: 'Madagascar', flag: '🇲🇬' },
  { code: 'MW', name: 'Malawi', flag: '🇲🇼' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'MV', name: 'Maldives', flag: '🇲🇻' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱' },
  { code: 'MT', name: 'Malta', flag: '🇲🇹' },
  { code: 'MH', name: 'Marshall Islands', flag: '🇲🇭' },
  { code: 'MR', name: 'Mauritania', flag: '🇲🇷' },
  { code: 'MU', name: 'Mauritius', flag: '🇲🇺' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'FM', name: 'Micronesia', flag: '🇫🇲' },
  { code: 'MD', name: 'Moldova', flag: '🇲🇩' },
  { code: 'MC', name: 'Monaco', flag: '🇲🇨' },
  { code: 'MN', name: 'Mongolia', flag: '🇲🇳' },
  { code: 'ME', name: 'Montenegro', flag: '🇲🇪' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
  { code: 'MZ', name: 'Mozambique', flag: '🇲🇿' },
  { code: 'MM', name: 'Myanmar', flag: '🇲🇲' },
  { code: 'NA', name: 'Namibia', flag: '🇳🇦' },
  { code: 'NR', name: 'Nauru', flag: '🇳🇷' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮' },
  { code: 'NE', name: 'Niger', flag: '🇳🇪' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'KP', name: 'North Korea', flag: '🇰🇵' },
  { code: 'MK', name: 'North Macedonia', flag: '🇲🇰' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'PW', name: 'Palau', flag: '🇵🇼' },
  { code: 'PS', name: 'Palestine', flag: '🇵🇸' },
  { code: 'PA', name: 'Panama', flag: '🇵🇦' },
  { code: 'PG', name: 'Papua New Guinea', flag: '🇵🇬' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'PR', name: 'Puerto Rico', flag: '🇵🇷' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼' },
  { code: 'KN', name: 'Saint Kitts and Nevis', flag: '🇰🇳' },
  { code: 'LC', name: 'Saint Lucia', flag: '🇱🇨' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines', flag: '🇻🇨' },
  { code: 'WS', name: 'Samoa', flag: '🇼🇸' },
  { code: 'SM', name: 'San Marino', flag: '🇸🇲' },
  { code: 'ST', name: 'São Tomé and Príncipe', flag: '🇸🇹' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳' },
  { code: 'RS', name: 'Serbia', flag: '🇷🇸' },
  { code: 'SC', name: 'Seychelles', flag: '🇸🇨' },
  { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰' },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮' },
  { code: 'SB', name: 'Solomon Islands', flag: '🇸🇧' },
  { code: 'SO', name: 'Somalia', flag: '🇸🇴' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'SS', name: 'South Sudan', flag: '🇸🇸' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: 'SD', name: 'Sudan', flag: '🇸🇩' },
  { code: 'SR', name: 'Suriname', flag: '🇸🇷' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'SY', name: 'Syria', flag: '🇸🇾' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼' },
  { code: 'TJ', name: 'Tajikistan', flag: '🇹🇯' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'TL', name: 'Timor-Leste', flag: '🇹🇱' },
  { code: 'TG', name: 'Togo', flag: '🇹🇬' },
  { code: 'TO', name: 'Tonga', flag: '🇹🇴' },
  { code: 'TT', name: 'Trinidad and Tobago', flag: '🇹🇹' },
  { code: 'TN', name: 'Tunisia', flag: '🇹🇳' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'TM', name: 'Turkmenistan', flag: '🇹🇲' },
  { code: 'TV', name: 'Tuvalu', flag: '🇹🇻' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
  { code: 'UZ', name: 'Uzbekistan', flag: '🇺🇿' },
  { code: 'VU', name: 'Vanuatu', flag: '🇻🇺' },
  { code: 'VA', name: 'Vatican City', flag: '🇻🇦' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'VI', name: 'Virgin Islands (U.S.)', flag: '🇻🇮' },
  { code: 'YE', name: 'Yemen', flag: '🇾🇪' },
  { code: 'ZM', name: 'Zambia', flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼' },
];

export const OTHER_COUNTRY: CountryInfo = { code: 'OTHER', name: 'Other', flag: '🌐' };

/** Backwards-compatible alias for code that references PILOT_COUNTRIES */
export const PILOT_COUNTRIES = COUNTRIES;

const COUNTRY_MAP = new Map<string, CountryInfo>(
  [...COUNTRIES, OTHER_COUNTRY].map((c) => [c.code, c]),
);

export function getCountryByCode(code: string): CountryInfo {
  return COUNTRY_MAP.get(code) || OTHER_COUNTRY;
}

export function getCountryFlag(code: string): string {
  return getCountryByCode(code).flag;
}

export function getCountryName(code: string): string {
  return getCountryByCode(code).name;
}

/** Manual overrides for pilot countries, algorithmic for the rest */
const PILOT_COLORS: Record<string, string> = {
  KE: '#006600',
  NG: '#008751',
  MW: '#ce1126',
  CD: '#007fff',
};

function hashColor(code: string): string {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 55%, 45%)`;
}

/** Get a consistent color for a country code (for charts/bars). */
export function getCountryColor(code: string): string {
  if (code === 'OTHER') return '#6b7280';
  return PILOT_COLORS[code] || hashColor(code);
}

/** Backwards-compatible record — prefers getCountryColor() for new code */
export const COUNTRY_COLORS: Record<string, string> & { OTHER: string } = new Proxy(
  { OTHER: '#6b7280' } as Record<string, string> & { OTHER: string },
  { get: (_target, prop: string) => getCountryColor(prop) },
);
```

- [ ] **Step 2: Verify build passes**

Run: `cd "/Volumes/2TB Drive/💪Work & Volunteer/🔵 gloki/Gloki Build/Communities2" && npx tsc -b --noEmit`
Expected: No type errors. The `COUNTRY_COLORS` proxy and `PILOT_COUNTRIES` alias maintain backward compatibility.

- [ ] **Step 3: Commit**

```bash
git add src/utils/countries.ts
git commit -m "feat: expand country list to full ISO 3166-1 with algorithmic colors"
```

---

## Task 5: Searchable country dropdown component

**Files:**
- Create: `src/components/shared/SearchableSelect.tsx`
- Create: `src/components/shared/SearchableSelect.module.scss`

- [ ] **Step 1: Create SearchableSelect component**

Create `src/components/shared/SearchableSelect.tsx`:

```typescript
import React, { useState, useRef, useEffect } from 'react';
import styles from './SearchableSelect.module.scss';

interface Option {
  value: string;
  label: string;
  icon?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={`${styles.trigger} ${disabled ? styles.disabled : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        {selected ? (
          <span>{selected.icon && `${selected.icon} `}{selected.label}</span>
        ) : (
          <span className={styles.placeholder}>{placeholder}</span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <input
            ref={inputRef}
            className={styles.searchInput}
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className={styles.optionsList}>
            {filtered.length === 0 ? (
              <div className={styles.noResults}>No matches</div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={`${styles.option} ${o.value === value ? styles.selected : ''}`}
                  onClick={() => handleSelect(o.value)}
                >
                  {o.icon && <span className={styles.optionIcon}>{o.icon}</span>}
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
```

- [ ] **Step 2: Create SearchableSelect styles**

Create `src/components/shared/SearchableSelect.module.scss`:

```scss
@use '../../styles/variables' as *;

.container {
  position: relative;
  width: 100%;
}

.trigger {
  display: flex;
  align-items: center;
  width: 100%;
  height: 40px;
  padding: 0 $spacing-sm;
  border: 1px solid $gray-200;
  border-radius: $radius-md;
  background: white;
  cursor: pointer;
  font-size: $text-sm;
  text-align: left;

  &.disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (prefers-color-scheme: dark) {
    background: $dark-surface;
    border-color: $dark-border;
    color: $dark-text;
  }
}

.placeholder {
  color: $gray-400;
}

.dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: white;
  border: 1px solid $gray-200;
  border-radius: $radius-md;
  box-shadow: $shadow-md;
  z-index: 50;

  @media (prefers-color-scheme: dark) {
    background: $dark-surface;
    border-color: $dark-border;
  }
}

.searchInput {
  width: 100%;
  padding: $spacing-sm;
  border: none;
  border-bottom: 1px solid $gray-100;
  font-size: $text-sm;
  outline: none;
  box-sizing: border-box;

  &:focus {
    border-bottom-color: $primary;
  }

  @media (prefers-color-scheme: dark) {
    background: $dark-surface;
    border-bottom-color: $dark-border;
    color: $dark-text;
  }
}

.optionsList {
  max-height: 200px;
  overflow-y: auto;
}

.option {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  width: 100%;
  padding: $spacing-sm;
  border: none;
  background: none;
  cursor: pointer;
  font-size: $text-sm;
  text-align: left;
  min-height: 44px;

  &:hover {
    background: $gray-50;
  }

  &.selected {
    background: rgba($primary, 0.1);
    color: $primary;
  }

  @media (prefers-color-scheme: dark) {
    color: $dark-text;

    &:hover {
      background: $dark-border;
    }
  }
}

.optionIcon {
  flex-shrink: 0;
}

.noResults {
  padding: $spacing-lg;
  text-align: center;
  color: $gray-400;
  font-size: $text-sm;
}
```

- [ ] **Step 3: Verify build passes**

Run: `cd "/Volumes/2TB Drive/💪Work & Volunteer/🔵 gloki/Gloki Build/Communities2" && npx tsc -b --noEmit`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/SearchableSelect.tsx src/components/shared/SearchableSelect.module.scss
git commit -m "feat: add SearchableSelect component for country dropdown"
```

---

## Task 6: Update Profile to use searchable country dropdown

**Files:**
- Modify: `src/components/identity/Profile.tsx`

- [ ] **Step 1: Update Profile imports and country selector**

In `src/components/identity/Profile.tsx`, add the import at the top (alongside existing imports):

```typescript
import SearchableSelect from '../shared/SearchableSelect';
import { COUNTRIES, OTHER_COUNTRY } from '../../utils/countries';
```

Remove the old import if it exists:
```typescript
// Remove: import { PILOT_COUNTRIES, OTHER_COUNTRY } from '../../utils/countries';
```

- [ ] **Step 2: Replace the country select dropdown**

Find the existing country `<select>` element (around lines 259-278) and replace it with:

```typescript
<div className="form-group">
  <label htmlFor="country">Country</label>
  <SearchableSelect
    options={[
      ...COUNTRIES.map((c) => ({ value: c.code, label: c.name, icon: c.flag })),
      { value: OTHER_COUNTRY.code, label: OTHER_COUNTRY.name, icon: OTHER_COUNTRY.flag },
    ]}
    value={country}
    onChange={(val) => setCountry(val)}
    placeholder="Select your country"
    disabled={!isEditing}
  />
</div>
```

- [ ] **Step 3: Verify build passes**

Run: `cd "/Volumes/2TB Drive/💪Work & Volunteer/🔵 gloki/Gloki Build/Communities2" && npx tsc -b --noEmit`
Expected: No type errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`
Navigate to Profile page. The country selector should now be a searchable dropdown. Type "Ger" — should filter to Germany. Select a country — should persist.

- [ ] **Step 5: Commit**

```bash
git add src/components/identity/Profile.tsx
git commit -m "feat: replace country select with searchable dropdown supporting all countries"
```

---

## Task 7: Pipeline stage progress dots

**Files:**
- Modify: `src/components/collaboration/PipelineView.tsx`
- Modify: `src/components/collaboration/PipelineView.module.scss`

- [ ] **Step 1: Update PipelineView stage rendering**

In `src/components/collaboration/PipelineView.tsx`, replace the pipeline progress bar section (lines 172-203) with connected dots instead of numbered squares with chevrons:

```typescript
{/* Pipeline progress dots */}
<div className={styles.pipeline}>
  {STAGES.map((s, idx) => {
    const isCompleted = idx < currentStageIndex;
    const isCurrent = idx === currentStageIndex;
    const isViewing = idx === viewStageIndex;
    return (
      <React.Fragment key={s.id}>
        {idx > 0 && (
          <div className={`${styles.connector} ${isCompleted ? styles.connectorCompleted : ''}`} />
        )}
        <button className={styles.stageBtn} onClick={() => setViewStage(s.id)}>
          <div
            className={`${styles.stageDot} ${isCompleted ? styles.completed : ''} ${isCurrent ? styles.current : ''} ${isViewing ? styles.viewing : ''}`}
          >
            {isCompleted ? '✓' : idx + 1}
          </div>
          <span
            className={`${styles.stageLabel} ${isCurrent ? styles.currentLabel : ''} ${isViewing && !isCurrent ? styles.viewingLabel : ''}`}
          >
            {s.label}
          </span>
        </button>
      </React.Fragment>
    );
  })}
</div>
```

- [ ] **Step 2: Remove the ChevronRight import if no longer used elsewhere**

At the top of the file, check if `ChevronRight` is used elsewhere. If not, remove it from the import:

```typescript
// Change:
import { ChevronRight, AlertTriangle } from 'lucide-react';
// To:
import { AlertTriangle } from 'lucide-react';
```

- [ ] **Step 3: Update PipelineView.module.scss with dot styles**

In `src/components/collaboration/PipelineView.module.scss`, replace the existing `.pipeline`, `.stage`, `.stageNumber`, and `.stageArrow` styles with:

```scss
.pipeline {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: $spacing-lg 0;
  gap: 0;
}

.connector {
  flex: 1;
  height: 2px;
  background: $gray-200;
  margin-top: 16px; // center with dot
  max-width: 40px;

  &.connectorCompleted {
    background: $success;
  }

  @media (prefers-color-scheme: dark) {
    background: $dark-border;
  }
}

.stageBtn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-xs;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  min-width: 48px;
}

.stageDot {
  width: 32px;
  height: 32px;
  border-radius: $radius-full;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $text-xs;
  font-weight: $font-semibold;
  border: 2px solid $gray-200;
  color: $gray-400;
  background: white;
  transition: all $transition-base;

  &.completed {
    background: $success;
    border-color: $success;
    color: white;
  }

  &.current {
    background: $primary;
    border-color: $primary;
    color: white;
  }

  &.viewing:not(.current):not(.completed) {
    border-color: $primary;
    color: $primary;
  }

  @media (prefers-color-scheme: dark) {
    background: $dark-surface;
    border-color: $dark-border;
    color: $dark-text-secondary;
  }
}

.stageLabel {
  font-size: $text-xs;
  color: $gray-400;
  white-space: nowrap;
}

.currentLabel {
  color: $primary;
  font-weight: $font-medium;
}

.viewingLabel {
  color: $primary;
}
```

Also remove the old `.stageNumber`, `.stageArrow`, and `.stage` classes if they exist separately.

- [ ] **Step 4: Verify build passes**

Run: `cd "/Volumes/2TB Drive/💪Work & Volunteer/🔵 gloki/Gloki Build/Communities2" && npx tsc -b --noEmit`
Expected: No type errors.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`
Navigate to an initiative pipeline. You should see connected dots with labels. Completed stages show green check marks, current stage is blue, tapping dots switches the view.

- [ ] **Step 6: Commit**

```bash
git add src/components/collaboration/PipelineView.tsx src/components/collaboration/PipelineView.module.scss
git commit -m "feat: pipeline stage progress dots with connected lines"
```

---

## Task 8: ProblemVoteFlow UX polish

**Files:**
- Modify: `src/components/collaboration/flows/voting/ProblemVoteFlow.tsx`
- Modify: `src/components/collaboration/flows/voting/ProblemVoteFlow.module.scss`

- [ ] **Step 1: Update ProblemVoteFlow vote display**

In `src/components/collaboration/flows/voting/ProblemVoteFlow.tsx`, replace the voting section (lines 118-150) with improved UX:

```typescript
{/* Voting */}
<div className={styles.votingSection}>
  <h4>Does this problem truly cross borders?</h4>
  <div className={styles.voteButtons}>
    <button
      className={`${styles.voteBtn} ${styles.upBtn} ${myVote === 'up' ? styles.active : ''}`}
      onClick={() => handleVote('up')}
      disabled={voting}
    >
      <ThumbsUp size={20} />
      <span className={styles.voteCount}>{tally.up}</span>
    </button>
    <button
      className={`${styles.voteBtn} ${styles.downBtn} ${myVote === 'down' ? styles.active : ''}`}
      onClick={() => handleVote('down')}
      disabled={voting}
    >
      <ThumbsDown size={20} />
      <span className={styles.voteCount}>{tally.down}</span>
    </button>
  </div>

  {/* Threshold progress bar */}
  <div className={styles.thresholdSection}>
    <div className={styles.progressTrack}>
      <div
        className={`${styles.progressFill} ${thresholdMet ? styles.thresholdMet : ''}`}
        style={{ width: `${Math.min((tally.up / Math.max(Math.ceil(communityMemberCount * 0.67), 1)) * 100, 100)}%` }}
      />
      <div className={styles.thresholdMarker} style={{ left: '100%' }} />
    </div>
    <div className={styles.thresholdLabels}>
      <span>{tally.up} upvote{tally.up !== 1 ? 's' : ''}</span>
      <span className={styles.thresholdTarget}>
        {thresholdMet ? 'Threshold met!' : `${Math.max(Math.ceil(communityMemberCount * 0.67) - tally.up, 0)} more needed`}
      </span>
    </div>
  </div>

  {myVote && (
    <p className={styles.yourVote}>
      You voted: <strong>{myVote === 'up' ? 'Yes' : 'No'}</strong> (tap again to remove)
    </p>
  )}
</div>
```

- [ ] **Step 2: Update ProblemVoteFlow styles**

Add/update these styles in `src/components/collaboration/flows/voting/ProblemVoteFlow.module.scss`:

```scss
.voteCount {
  font-size: $text-lg;
  font-weight: $font-semibold;
}

.thresholdSection {
  margin-top: $spacing-lg;
}

.progressTrack {
  position: relative;
  height: 8px;
  background: $gray-100;
  border-radius: $radius-full;
  overflow: visible;

  @media (prefers-color-scheme: dark) {
    background: $dark-border;
  }
}

.progressFill {
  height: 100%;
  background: $primary;
  border-radius: $radius-full;
  transition: width $transition-base;

  &.thresholdMet {
    background: $success;
  }
}

.thresholdMarker {
  position: absolute;
  top: -4px;
  width: 2px;
  height: 16px;
  background: $gray-400;
  transform: translateX(-1px);
}

.thresholdLabels {
  display: flex;
  justify-content: space-between;
  margin-top: $spacing-xs;
  font-size: $text-xs;
  color: $gray-400;
}

.thresholdTarget {
  font-weight: $font-medium;
}

.yourVote {
  margin-top: $spacing-sm;
  font-size: $text-xs;
  color: $gray-400;
}
```

- [ ] **Step 3: Remove the old `.metric` and `.progressBar` / `.progressFill` styles if they conflict**

Remove old styles that the new code replaces, such as `.metric`, the old `.progressBar`, and the old `.progressFill`.

- [ ] **Step 4: Verify build passes**

Run: `cd "/Volumes/2TB Drive/💪Work & Volunteer/🔵 gloki/Gloki Build/Communities2" && npx tsc -b --noEmit`
Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/collaboration/flows/voting/ProblemVoteFlow.tsx src/components/collaboration/flows/voting/ProblemVoteFlow.module.scss
git commit -m "feat: ProblemVoteFlow threshold progress bar and vote status display"
```

---

## Task 9: ApprovalFlow voting UX polish

**Files:**
- Modify: `src/components/collaboration/flows/voting/ApprovalFlow.tsx`

- [ ] **Step 1: Update ApprovalFlow results to use getCountryColor**

In `src/components/collaboration/flows/voting/ApprovalFlow.tsx`, update the import:

```typescript
// Change:
import { COUNTRY_COLORS } from '../../../../utils/countries';
// To:
import { getCountryColor, getCountryName } from '../../../../utils/countries';
```

- [ ] **Step 2: Update the results bar to use getCountryColor and show country names in tooltips**

Replace the country breakdown rendering in the results section (around lines 213-223):

```typescript
{Object.entries(breakdown).map(([country, count]) => (
  <div
    key={country}
    className={styles.resultSegment}
    style={{
      width: `${(count / maxApprovals) * 100}%`,
      backgroundColor: getCountryColor(country),
    }}
    title={`${getCountryName(country)}: ${count}`}
  />
))}
```

- [ ] **Step 3: Verify build passes**

Run: `cd "/Volumes/2TB Drive/💪Work & Volunteer/🔵 gloki/Gloki Build/Communities2" && npx tsc -b --noEmit`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/collaboration/flows/voting/ApprovalFlow.tsx
git commit -m "feat: ApprovalFlow uses country names in tooltips and algorithmic colors"
```

---

## Task 10: QVFlow voting UX polish

**Files:**
- Modify: `src/components/collaboration/flows/voting/QVFlow.tsx`

- [ ] **Step 1: Update QVFlow imports**

In `src/components/collaboration/flows/voting/QVFlow.tsx`, update the import:

```typescript
// Change:
import { COUNTRY_COLORS } from '../../../../utils/countries';
// To:
import { getCountryColor, getCountryName } from '../../../../utils/countries';
```

- [ ] **Step 2: Update QVFlow results to use getCountryColor and country names**

Replace the country breakdown in results (around lines 219-222):

```typescript
{Object.entries(breakdown).map(([country, votes]) => (
  <div key={country} className={styles.resultSegment}
    style={{ width: `${(votes / maxVotes) * 100}%`, backgroundColor: getCountryColor(country) }}
    title={`${getCountryName(country)}: ${votes.toFixed(1)} votes`} />
))}
```

- [ ] **Step 3: Verify build passes**

Run: `cd "/Volumes/2TB Drive/💪Work & Volunteer/🔵 gloki/Gloki Build/Communities2" && npx tsc -b --noEmit`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/collaboration/flows/voting/QVFlow.tsx
git commit -m "feat: QVFlow uses country names and algorithmic colors in results"
```

---

## Task 11: ConcernsFlow — collapse resolved concerns

**Files:**
- Modify: `src/components/collaboration/flows/concerns/ConcernsFlow.tsx`
- Modify: `src/components/collaboration/flows/concerns/ConcernsFlow.module.scss`

- [ ] **Step 1: Add collapsed state for resolved concerns**

In `src/components/collaboration/flows/concerns/ConcernsFlow.tsx`, add state near the other useState declarations:

```typescript
const [showResolved, setShowResolved] = useState(false);
```

- [ ] **Step 2: Update resolved concerns rendering**

Find where resolved concerns are rendered (after the active concerns section). Wrap them with a collapsible toggle:

```typescript
{resolved.length > 0 && (
  <div className={styles.resolvedSection}>
    <button
      className={styles.resolvedToggle}
      onClick={() => setShowResolved((v) => !v)}
    >
      Resolved ({resolved.length})
      <span className={styles.toggleArrow}>{showResolved ? '▾' : '▸'}</span>
    </button>
    {showResolved && resolved.map((concern) => (
      // existing concern rendering for resolved items
    ))}
  </div>
)}
```

Note: Adapt this to match the exact rendering pattern already used for resolved concerns in the existing code.

- [ ] **Step 3: Add styles for the collapsed section**

Add to `src/components/collaboration/flows/concerns/ConcernsFlow.module.scss`:

```scss
.resolvedSection {
  margin-top: $spacing-lg;
  border-top: 1px solid $gray-100;
  padding-top: $spacing-sm;

  @media (prefers-color-scheme: dark) {
    border-top-color: $dark-border;
  }
}

.resolvedToggle {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  background: none;
  border: none;
  cursor: pointer;
  font-size: $text-sm;
  color: $gray-400;
  padding: $spacing-sm 0;
  width: 100%;
}

.toggleArrow {
  font-size: $text-xs;
}
```

- [ ] **Step 4: Verify build passes**

Run: `cd "/Volumes/2TB Drive/💪Work & Volunteer/🔵 gloki/Gloki Build/Communities2" && npx tsc -b --noEmit`
Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/collaboration/flows/concerns/ConcernsFlow.tsx src/components/collaboration/flows/concerns/ConcernsFlow.module.scss
git commit -m "feat: collapse resolved concerns by default with toggle"
```

---

## Task 12: Homepage initiative feed

**Files:**
- Create: `src/components/identity/InitiativeFeed.tsx`
- Create: `src/components/identity/InitiativeFeed.module.scss`
- Modify: `src/pages/IdentityView.tsx`
- Modify: `src/components/identity/HomepageMenu.tsx`

- [ ] **Step 1: Create InitiativeFeed component**

Create `src/components/identity/InitiativeFeed.tsx`:

```typescript
import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchCollaborations, fetchCommunityProperties } from '../../store/slices/communitiesSlice';
import type { Collaboration } from '../../services/contracts/community';
import styles from './InitiativeFeed.module.scss';

interface InitiativeWithCommunity extends Collaboration {
  communityId: string;
  communityName: string;
}

const InitiativeFeed: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { contracts, serverUrl, publicKey } = useAppSelector((s) => s.user);
  const { communityCollaborations, communityProperties } = useAppSelector((s) => s.communities);
  const { hidden } = useAppSelector((s) => s.preferences);

  const communityContracts = useMemo(
    () => contracts.filter((c) => c.contract === 'community_contract.py' && !hidden.includes(c.id)),
    [contracts, hidden],
  );

  // Fetch collaborations and properties for all communities
  useEffect(() => {
    if (!serverUrl || !publicKey) return;
    communityContracts.forEach((c) => {
      if (!communityCollaborations[c.id]) {
        dispatch(fetchCollaborations({ serverUrl, publicKey, contractId: c.id }));
      }
      if (!communityProperties[c.id]) {
        dispatch(fetchCommunityProperties({ serverUrl, publicKey, contractId: c.id }));
      }
    });
  }, [serverUrl, publicKey, communityContracts, communityCollaborations, communityProperties, dispatch]);

  const allInitiatives: InitiativeWithCommunity[] = useMemo(() => {
    const result: InitiativeWithCommunity[] = [];
    for (const c of communityContracts) {
      const collabs = communityCollaborations[c.id] ?? [];
      const name = communityProperties[c.id]?.name || c.name || c.id.slice(0, 8);
      for (const collab of collabs) {
        if (collab.type === 'initiative') {
          result.push({ ...collab, communityId: c.id, communityName: name });
        }
      }
    }
    return result.sort((a, b) =>
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    );
  }, [communityContracts, communityCollaborations, communityProperties]);

  const handleClick = (item: InitiativeWithCommunity) => {
    const hostServer = item.hostServer || serverUrl || 'local';
    const hostAgent = item.hostAgent || publicKey || 'local';
    navigate(`/initiative/${encodeURIComponent(hostServer)}/${encodeURIComponent(hostAgent)}/${item.communityId}/${item.id}`);
  };

  if (!serverUrl || !publicKey) {
    return <div className={styles.empty}>Log in to see initiatives</div>;
  }

  return (
    <div className={styles.feed}>
      {allInitiatives.length === 0 ? (
        <div className={styles.empty}>
          <Zap size={48} className={styles.emptyIcon} />
          <p>No initiatives yet</p>
          <p className={styles.emptyHint}>Create or join a community, then start an initiative from the community's Initiative tab.</p>
        </div>
      ) : (
        allInitiatives.map((item) => (
          <button key={item.id} className={styles.card} onClick={() => handleClick(item)}>
            <div className={styles.cardHeader}>
              <Zap size={16} className={styles.cardIcon} />
              <span className={styles.communityName}>{item.communityName}</span>
            </div>
            <div className={styles.cardTitle}>{item.title || 'Untitled Initiative'}</div>
          </button>
        ))
      )}
    </div>
  );
};

export default InitiativeFeed;
```

- [ ] **Step 2: Create InitiativeFeed styles**

Create `src/components/identity/InitiativeFeed.module.scss`:

```scss
@use '../../styles/variables' as *;

.feed {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  padding: 0 $spacing-lg;
}

.card {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  padding: $spacing-lg;
  border: 1px solid $gray-100;
  border-radius: $radius-lg;
  background: white;
  cursor: pointer;
  text-align: left;
  transition: box-shadow $transition-base;
  width: 100%;

  &:hover {
    box-shadow: $shadow-md;
  }

  @media (prefers-color-scheme: dark) {
    background: $dark-surface;
    border-color: $dark-border;
  }
}

.cardHeader {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
}

.cardIcon {
  color: $primary;
  flex-shrink: 0;
}

.communityName {
  font-size: $text-xs;
  color: $gray-400;
}

.cardTitle {
  font-size: $text-sm;
  font-weight: $font-medium;
  color: $gray-900;

  @media (prefers-color-scheme: dark) {
    color: $dark-text;
  }
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $spacing-3xl $spacing-xl;
  text-align: center;
  color: $gray-400;
  font-size: $text-sm;
}

.emptyIcon {
  color: $gray-200;
  margin-bottom: $spacing-lg;
}

.emptyHint {
  font-size: $text-xs;
  max-width: 300px;
  margin-top: $spacing-xs;
}
```

- [ ] **Step 3: Update IdentityView to show InitiativeFeed as default**

Replace `src/pages/IdentityView.tsx` entirely:

```typescript
import React, { useState } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import InitiativeFeed from '../components/identity/InitiativeFeed';
import Communities from '../components/identity/Communities';
import Profile from '../components/identity/Profile';
import JoinCommunity from '../components/identity/JoinCommunity';
import HomepageMenu from '../components/identity/HomepageMenu';
import AboutPage from '../components/identity/AboutPage';
import ContactPage from '../components/identity/ContactPage';
import styles from './Container.module.scss';

const IdentityView: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleNavigate = (path: string) => {
    navigate(`/identity/${path}`);
  };

  return (
    <div className={styles.container}>
      <PageHeader
        title="Gloki"
        layout="homepage"
        onMenuClick={() => setMenuOpen(true)}
      />

      <HomepageMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        onCreateCommunity={() => {
          navigate('/identity/communities', { state: { createCommunity: true } });
        }}
      />

      <div className={styles.content}>
        <div className={styles.main}>
          <Routes>
            <Route index element={<InitiativeFeed />} />
            <Route path="communities" element={<Communities />} />
            <Route path="profile" element={<Profile />} />
            <Route path="join" element={<JoinCommunity />} />
            <Route path="about" element={<AboutPage onBack={() => navigate('/identity')} />} />
            <Route path="contact" element={<ContactPage onBack={() => navigate('/identity')} />} />
            <Route path="hidden" element={<Communities showHidden />} />
            <Route path="*" element={<Navigate to="/identity" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default IdentityView;
```

Key changes:
- Added `index` route pointing to `InitiativeFeed` (the new homepage default)
- `communities` is now a named route, not the default
- About/Contact "back" buttons navigate to `/identity` (feed) instead of `/identity/communities`
- Catch-all redirects to `/identity` instead of `/identity/communities`

- [ ] **Step 4: Update HomepageMenu to add Communities link**

In `src/components/identity/HomepageMenu.tsx`, add a Communities menu item. Add the `LayoutGrid` icon import and a new button before the Profile button:

```typescript
import { User, QrCode, Plus, LogOut, EyeOff, Info, Mail, X, LayoutGrid } from 'lucide-react';
```

Add this button as the first menu item (before Profile):

```typescript
<button className={styles.menuItem} onClick={() => { onNavigate('communities'); onClose(); }}>
  <LayoutGrid size={20} />
  <span>Communities</span>
</button>
```

- [ ] **Step 5: Verify build passes**

Run: `cd "/Volumes/2TB Drive/💪Work & Volunteer/🔵 gloki/Gloki Build/Communities2" && npx tsc -b --noEmit`
Expected: No type errors. Check for any missing imports or type mismatches with the `Collaboration` type.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`
- Homepage should now show an initiative feed (or empty state if no initiatives exist)
- Menu should show "Communities" as first item
- Clicking Communities navigates to the community grid (old homepage view)
- Each initiative card should navigate to its pipeline view

- [ ] **Step 7: Commit**

```bash
git add src/components/identity/InitiativeFeed.tsx src/components/identity/InitiativeFeed.module.scss src/pages/IdentityView.tsx src/components/identity/HomepageMenu.tsx
git commit -m "feat: homepage redesign — initiative feed as default landing page"
```

---

## Verification Checklist

After all tasks, run the full build and verify:

```bash
cd "/Volumes/2TB Drive/💪Work & Volunteer/🔵 gloki/Gloki Build/Communities2" && npx tsc -b --noEmit && npm run build
```

Manual checks in browser:
1. Contract loading shows diagnostic logs in console
2. "Deploying contract..." times out after 30s → shows error + Retry button
3. Country selector shows full list with search
4. Pipeline shows connected dots instead of numbered boxes
5. ProblemVoteFlow shows threshold progress bar
6. ApprovalFlow/QVFlow show country names in result tooltips
7. Resolved concerns are collapsed by default
8. Homepage shows initiative feed, communities accessible via menu
