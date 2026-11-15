# Sajilo GK — version 3

Smart Loksewa Preparation Made Simple.

This release implements the approved product design using Vanilla HTML/CSS/JavaScript and your supplied Firebase configuration. It has first-login examination/subject selection, deduplicated My Subjects, subject/chapter/topic/level navigation, structured multimedia materials, separate reading and mastery metrics, Saved collections and combined-filter revision.

**Existing users: start with UPDATE-FIRST.md. New projects: START-HERE.md.** No Firebase Rules/indexes have been deployed to your account by this ZIP. No live production acceptance pass is claimed.

## Start here

1. Unzip this directory.
2. Configure Firebase using [SETUP.md](SETUP.md). Deploy Rules and indexes before using real student data.
3. The verified deepakrajpant978@gmail.com account is the primary owner after the new Rules are published. Other accounts remain students unless staff access is explicitly granted by that owner.
4. Serve over HTTP/HTTPS, not `file://`. With Node 20+ installed, run `node tests/serve.mjs` and open `http://127.0.0.1:4173`.
5. Sign in, verify your email, then open `#/admin/import`. Click **Load included sample for preview**, inspect it, and commit it in **Add new** mode.
6. Read [QA.md](QA.md) before public launch. This package has not been live acceptance-tested against your Firebase project.

## Included flows

- Email/password and Google sign-in, verification, reset and local session persistence.
- Private student data and role-protected administrative navigation.
- Real-data dashboard, goals, recommendations, streak, published-content counts and due revisions.
- Paginated exam/subject/chapter/topic navigation and L1/L2/L3 question study.
- Answer reveal, keyboard navigation, flashcard mode, bookmarks, learning flags, reports and personal notes.
- Sanitized rich chapter notes, table of contents, search, reading controls, saved selections and printing.
- SM-2 revision, wrong/bookmarked/difficult/due modes, exam-day ordering and summaries.
- Weighted mixed practice and level-based/published tests.
- Timed attempts, palette, review marks, IndexedDB recovery, submission, versioned solutions and detailed results.
- Content editing, soft deletion/restoration, duplicates, staged drafts and revision history.
- JSON import validation/preview, explicit conflict modes, per-record commits, cancellation and error downloads.
- Paginated JSON/CSV export, optional answer keys, student access controls, reports and settings.
- Current-affairs and formula content, study planning, SVG analytics, theme preference and installable PWA assets.

## Important boundaries

This is a practice application, not a secure proctored exam system. The normal test interface does not request solutions before submission, but published study solutions are readable by entitled students. A student can inspect network calls, brute-force option hashes, alter their own practice records, or submit fabricated browser scores. Use trusted backend grading for certificates, paid competitions, trustworthy rankings or consequential exams.

Firestore Rules validate ownership and basic shapes. They cannot prove that a student genuinely studied or answered correctly. Administrative logging records application actions but is not independently tamper-proof against privileged operators.

Search is exact normalized keyword matching via `searchEntries`, not arbitrary full-text/fuzzy search. Candidate pages are filtered for additional words; empty candidate pages can still have a next page. Complex filter combinations may require additional composite indexes; the Firebase error console provides the index link. Avoid creating arbitrary indexes until needed.

Bounded recommendation and mixed-practice candidate pools trade perfect global optimization for predictable reads. A shortage is disclosed before starting a practice test. Level-unlock checks are motivational practice controls, not anti-cheat controls.

Offline support requires an initial successful online load of the application and the relevant modules/content. Cached notes/questions are readable; writes and final submission require reconnection. A running test preserves answers locally. Its timer continues while the tab is closed. Clients can alter their local clock, so the timer is not a security boundary.

No background push or email reminder service is included. Reminders appear in the application. No student information is embedded in the sample data. The designated primary admin email is explicitly configured in the access module and Rules.

## Files

The requested compact module tree is preserved. Supporting documentation lives at the root. `tests/` contains a dependency-free static server, executable algorithm/static checks and the generated results report. `firebase.json` points the Firebase CLI to the supplied Rules and index files.

## Validation

Run:

```sh
node --experimental-vm-modules tests/run.mjs
```

This checks every application JavaScript file, local module paths, Nepal dates, SM-2, mastery transitions, mixed sampling, scoring, sample data and index limits. Firebase imports are stubbed for pure-function tests. These are **not** Firestore Rules or live integration tests. See `tests/results.json` for the executed checks and `QA.md` for manual acceptance work.

## Performance and quota

- UI list pages use 20-record cursor queries.
- Only modules needed by the current route are imported.
- Static assets use a versioned cache. Private Firestore responses are never put in the Service Worker cache.
- IndexedDB is UID-scoped and cleared on logout. Avoid persisting sensitive data on shared devices.
- Retry is limited to transient errors with backoff. Failed mutations are surfaced.
- Draft content and snapshots are excluded from unnecessary indexing where configured.
- Aggregate counts still consume reads. Recommendations, reports, exports and imports can be expensive. Monitor actual Firebase usage; free-tier capacity is not unlimited.

## Sample content

`data/sample.json` contains 18 author-created science practice questions, 9 structured level materials, a chapter note and generated test-set definitions. They are explicitly marked **predicted**, not official or verified PYQs. Some sets request more questions than the sample contains to exercise shortage handling. The sample is for exercising workflows and is not a complete Loksewa syllabus.

## License

Project-specific source is provided for your use and modification. Firebase and fonts remain subject to their providers’ terms. Use only images, notes and question material you have permission to distribute.
