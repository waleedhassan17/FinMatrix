ROLE: Act as a senior React Native engineer doing a QUALITY + STRUCTURE refactor. You have two projects
locally (I'll give you both paths):
- REFERENCE (the standard to follow): Consultant_Mobile — a clean, professionally-structured RN project.
- TARGET (to improve): FinMatrix — a working React Native + Expo + Redux Toolkit accounting app.

GOAL: Raise FinMatrix's FRONTEND code quality and structure to match the conventions in Consultant_Mobile —
folder structure, file naming, navigators, navigation maps, App.tsx, components, Redux slices, the network
layer, models, and serializers. This is a REFACTOR FOR QUALITY ONLY. Do NOT change app behavior, features,
UI output, or any accounting logic. Every screen must do exactly what it did before.

⚠️ IRON RULES (a refactor that changes behavior is a FAILURE):
- Do NOT add, remove, or alter features, screens, or business logic. Same inputs → same outputs, same API
  calls with the same payloads/params, same rendered UI.
- Do NOT touch any accounting/posting/calculation logic. If a change would alter what a network call sends
  or how a response is parsed into state, DO NOT make it.
- This is FRONTEND ONLY. Do not modify FinMatrix-Backend.
- Refactor in SMALL, reviewable commits, one concern at a time. After each, `npx tsc --noEmit` must stay
  clean and the app must still build and run.
- Prefer moving/renaming/reorganizing and extracting shared patterns over rewriting logic. When in doubt,
  preserve behavior and flag it rather than "improving" it.

============================ PHASE 0 — STUDY BOTH, PROPOSE A PLAN (produce REFACTOR_PLAN.md, then STOP) ============================
1. Read Consultant_Mobile thoroughly and DOCUMENT its conventions as the target standard:
   - Folder structure and where each kind of file lives.
   - File + folder NAMING conventions (case style, suffixes like .slice, .api, .model, .serializer, etc.).
   - How navigators and navigation maps are structured; how App.tsx is composed.
   - Component structure/patterns; how Redux slices are written; the network/API layer shape; how models
     and serializers are defined and used.
2. Read FinMatrix's frontend and map its CURRENT structure against that standard: what already matches,
   and what diverges (messy folders, inconsistent names, inline network calls, missing serializers/models,
   ad-hoc navigation, bloated App.tsx, etc.).
3. Produce REFACTOR_PLAN.md: a prioritized, file-by-file plan of the changes to align FinMatrix to
   Consultant_Mobile's standard, grouped by concern (structure/naming → navigation/App.tsx → network layer
   → models/serializers → slices → components). For EACH change, note it's behavior-preserving and how you'll
   verify that. Explicitly list anything risky (where a rename/move could break an import path or change a
   payload) and how you'll guard it.
   STOP and wait for my approval before changing any code.

============================ PHASE 1 — STRUCTURE & NAMING ============================
Reorganize folders and rename files/folders to match the reference conventions. Update all imports
accordingly. Pure moves/renames — no logic changes. Verify tsc clean + app builds after this phase.

============================ PHASE 2 — NAVIGATION & App.tsx ============================
Restructure navigators, navigation maps, and App.tsx to mirror Consultant_Mobile's patterns (e.g. clean
navigation-map arrays, a tidy root composition). The SAME screens must be reachable by the SAME routes with
the SAME behavior — only the structure/quality of the navigation code changes. Verify every route still
resolves to the same screen.

============================ PHASE 3 — NETWORK LAYER, MODELS, SERIALIZERS ============================
Align the API/network layer, model definitions, and serializers to the reference style. CRITICAL: the
actual requests (URLs, methods, headers, body shape, query params) and the parsed results MUST be identical
to before — you are restructuring HOW they're written, not WHAT they send/receive. If the reference uses
dedicated model + serializer files, introduce them for FinMatrix's entities, but the serialized/deserialized
shape must match what the app currently produces. Add types where missing without changing runtime behavior.

============================ PHASE 4 — SLICES & COMPONENTS ============================
Refactor Redux slices and components to the reference's quality/patterns (naming, structure, separation of
concerns, reusable components). State shape and selectors must remain behavior-equivalent — components must
render the same output and dispatch the same actions with the same effects. Extract shared/reusable
components where the reference would, without altering appearance or behavior.

============================ VERIFICATION & DELIVERABLES ============================
- After every phase: `npx tsc --noEmit` clean; app builds and runs; the touched screens behave identically.
- Do a before/after spot check on the key flows (an invoice, a payment, a report load, a delivery assign):
  confirm the same API calls fire with the same payloads and the same UI renders. Report this.
- Do NOT auto-commit-and-push blindly: make small commits per phase with clear messages; show me the diffs
  summary per phase so I can review that behavior was preserved.
- Deliver REFACTOR_PLAN.md, the phased commits, and a short REFACTOR_CHANGELOG.md listing what was
  restructured (structure/naming, navigation, network, models/serializers, slices, components) with an
  explicit statement that no behavior, feature, API payload, or accounting logic changed and that tsc +
  build are green.

  do update the code in seprate branch git checkout -b quality-refactor