# Sajilo GK v3 — quick start

## What is included

- index.html SPA shell and separate CSS/ES-module JavaScript source.
- Your Firebase web configuration, unchanged.
- Email/password and Google sign-in, verification and password reset.
- First-login examination and subject setup; shared subjects are canonical and displayed once.
- Five-tab navigation: Home, My Subjects, Revision, Tests and Saved.
- Subject/chapter/topic pages and three levels of material/question study.
- Material block editor: headings, rich text, lists, tables, image/alt, audio/transcript, YouTube, reference links, key facts, mistakes, tips and summary.
- Read/unread, saved position, favourites, revision membership, personal importance, notes with autosave, reports and deep links.
- Reading completion and evidence-based mastery as separate metrics; unassessed is not failed.
- Timed tests, recovery, immutable snapshots, detailed results and wrong-answer revision.
- Saved materials/questions/notes, subject/chapter/topic/level filters and quick revision formats.
- Admin drafts/publication/history, examination mappings, JSON import/export, reports, students and settings.
- PWA assets, caching, a local development server and recorded checks.

## Setup order

1. Open SETUP.md and enable the Auth providers in Firebase.
2. Publish firebase/rules.txt and deploy firebase/indexes.json before using real accounts. The bundled firebase.json points the Firebase CLI at these files.
3. Run `node tests/serve.mjs` from this folder. Open http://127.0.0.1:4173. Do not open index.html using file://, because browser ES modules and Firebase need HTTP/HTTPS.
4. Register or sign in as deepakrajpant978@gmail.com and verify the email. With the new Rules published, this exact account is automatically the primary owner. No manual owner-role document is required. Navigate directly to #/admin to import seed content if onboarding has no published exams yet.
5. In Admin → Import/export, load the sample for preview and commit. The sample contains 3 examinations, one shared subject, 3 topics, 9 level materials and 18 predicted science questions. It contains no student activity.
6. Return to #/onboarding/exams, select examinations, select subjects and open the dashboard.
7. For GitHub Pages, upload this folder’s contents to the publishing root, enable Pages, add your github.io domain to Firebase Auth and wait for indexes.

## Existing project upgrades

Read UPDATE-FIRST.md before updating an existing site. Publish the new Rules, replace the complete source folder and activate the Service Worker update before assessing admin access.


Deploy the new Rules and indexes first. Existing profiles are guided through the new subject setup. Existing study/test records remain intact. To add the new sample to an existing database, validate using Add or update mode and deliberately review the planned changes. Add New correctly rejects existing IDs.

Subject examId remains a legacy canonical owner field; examIds is the multi-examination mapping. New subject/test navigation resolves through the canonical subject. Materials are stored in their own top-level collection; legacy chapter notes remain available.

## Checks

Run both:

- node --experimental-vm-modules tests/run.mjs
- node --experimental-vm-modules tests/flows.mjs

The first checks syntax, imports and algorithms. The second exercises actual services against an in-memory repository. Neither replaces Firebase Rules emulator or real-browser tests. See tests/results.json, tests/flow-results.json and QA.md.

## Before launch

The live Firebase project, real authentication flows, Rules semantics, mobile rendering, browser accessibility, media playback and PWA installation have not been acceptance-tested here. Complete the staging checklist in QA.md. Client-produced scores are practice scores, not anti-cheat credentials.
