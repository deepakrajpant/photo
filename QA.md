# QA and release status

## Executed checks

See `tests/results.json` for the exact executed check list, timestamp and pass count. Run again with:

```sh
node --experimental-vm-modules tests/run.mjs
```

The tests cover JavaScript parsing, local import paths, pure scheduling/mastery/sampling/scoring logic, Unicode/date helpers, sample structure and static Rules assertions. They do not demonstrate successful deployment or validate Rules semantics.

## Browser smoke attempt

The local development server started, but the browser could not reach loopback (connection timeout). A direct HTTP readiness probe was also blocked by the host socket policy. Browser rendering, visual QA and live Firebase flows therefore remain unverified.

## Release gates still required

No live Firebase credentials, administrative provisioning or test student accounts were available during packaging. The project is **not certified production-ready**. Complete the following in a staging Firebase project before launch.

| Area | Acceptance test |
|---|---|
| Auth | Signup, verification, refresh, reset, Google popup, logout and shared-device cache clearing |
| Rules | User A cannot read/write user B; cannot grant premium, edit roles, publish content or mutate submitted attempts |
| Editorial | Invalid answer/hierarchy blocked; draft edits preserve published notes; publish, soft delete, restore and version review |
| Import | Invalid syntax, duplicates, invalid answer, parent missing, version conflict, cancellation and interrupted partial import |
| Study | 2–6 options, Devanagari, reveal, keyboard shortcuts, bookmarks, notes and reports survive reload |
| Notes | Sanitizer blocks scripts/events/unsafe URLs; TOC, selection saving, print, fullscreen and mobile tables |
| Revision | Due at Nepal midnight, Again reset, same-day mastery prevention, missing content and shortages |
| Tests | Marks, negative marks, pass threshold, expiry, offline recovery, refresh, interrupted grading and wrong retry |
| Analytics | Counts compared against actual documents; target-exam denominators and empty states reviewed |
| Settings | Maintenance, notes visibility, feature toggles, premium expiry and registration policy |
| PWA | HTTPS install, all icons, update prompt, repository subpath, cached route opening, logout and storage restrictions |
| Accessibility | Keyboard-only use, focus restoration, screen-reader announcements, contrast, 320px viewport and 200% zoom |
| Performance | Network throttling, read/write monitoring, index availability and expected student concurrency |

## Known implementation limits

- Practice scores, learning activity and streaks are client-produced and are not authoritative credentials.
- Answer confidentiality cannot be enforced while entitled users can study those same published solutions. No hash-based security claim is made.
- Recommendation and mixed-test engines sample bounded candidate pools. Recent progress pages are used for some personalization; they are not a complete scan of every historical question.
- Scope statistics are transactionally maintained from activity recorded by this version. Existing older progress records require an explicit reconciliation migration before aggregate subject/topic/level statistics can represent that earlier history. The heatmap queries all records in the last 91 days using cursor pages.
- Planner stores dated chapter plans and completion; it is not an external calendar integration.
- Reading certificates acknowledge chapter reading, not verified chapter mastery.
- No trusted public leaderboard or background notifications are enabled. First mastery and seven-day streak milestones are recorded from private learning activity; aggregate reconciliation for pre-existing data remains an operator migration task.
- HTML sanitization is performed by the app. Rules cannot sanitize arbitrary HTML; student display sanitizes again. Only trusted editors should publish content.
- UI write validation is more detailed than some generic content Rules. Treat full Rules emulator tests and tighter per-content field allowlists as a release gate.
- Rich editor formatting uses the browser’s legacy editing commands. The output is sanitized and plain HTML can be edited; browser behavior must be tested on target devices.
- Admin exact-email search is supported; arbitrary substring name/email search is not provided.
- Firestore provides no Standard-edition full-text search. Multi-token search filters candidate pages, and arbitrary filter combinations can need more indexes.
- Client clocks affect practice timers and SM-2 dates. A trusted server is required for anti-cheat timing and verified review histories.
- Firestore free-tier capacity depends on traffic and query shape. There is no guarantee of unlimited students or globally current offline counts.
- No full syllabus is bundled: sample content is 18 predicted science questions only.

Do not use this package for paid high-stakes testing until its security and operational requirements have been independently verified.

## Scope coverage disclosure

This delivery implements the learning, editorial, revision and practice-test workflows documented in README. It is not a claim that every advanced item in the original specification is finished. Optional public leaderboard, automated new-content notification fanout, full reminder preference enforcement, authoritative grading, full schema migrations, complete historical reconciliation, exhaustive audit-write coupling and chapter-mastery certificates are not completed. The included certificate acknowledges reading. Do not present those as available features.

## Version 2 verification addendum

The approved onboarding, canonical subject selection, topic-level materials, Saved collections, structured media editor and combined-filter revision are implemented in the source. See tests/results.json for syntax/pure-function checks and tests/flow-results.json for in-memory service checks. These are not live Firebase tests.

Remaining acceptance gates: real Auth/provider configuration, Rules emulator validation, full composite-index combinations, shared-device cache isolation, accessibility/contrast, mobile layout, network-loss recovery, user media playback and PWA installation. The common student controls have Nepali labels with English fallback; editorial and some dynamic operational text remains English. No automatic translation of learning content is performed.

Legacy scope-counter documents are retained for compatibility; new dashboard/subject reading and mastery values are computed from currently eligible content plus actual user records. This is accurate but may consume additional reads for users with long histories; monitor quotas before scaling.

The index manifest keeps 179 composite indexes. Equality-only query combinations can use Firestore index merging; source: https://firebase.google.com/docs/firestore/query-data/index-overview#use_index_merging. Existing unrelated project indexes may consume additional quota. Review the live index inventory before deployment.

## Version 3 owner/navigation verification

The verified primary-owner email replaces manual Console role bootstrap for that account. Admin buttons, explicit routes, connection recovery, partial-summary errors and owner-only staff delegation are included. Run tests/auth-navigation.mjs along with the two existing suites. It exercises actual auth/access code with mocked Firebase reads and records results in tests/auth-navigation-results.json. These checks do not validate deployed Rules semantics or real-browser rendering.

Verify the new role policy on staging before launch: the primary owner can read/write administrative data; an unverified matching email cannot; ordinary users cannot grant roles or read another user’s records; delegated admin/editor/support roles stay within scope; disabled or suspended staff lose access. Confirm the new navigation at 320px and on desktop. Confirm #/admin/setup remains accessible after an expected permission error.
