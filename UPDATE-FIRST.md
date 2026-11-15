# Update this version first

This version uses the verified owner email **deepakrajpant978@gmail.com**. The primary owner does not need an `adminRoles/{uid}` document. Other students receive no admin rights merely by signing in.

## Three required steps

1. **Replace the website files with the contents of this folder.** Keep `index.html` at the GitHub Pages publishing root. Include `assets`, `firebase`, `data`, `manifest.json` and `sw.js`.
2. **Publish the new Rules once:** Firebase Console → project `loksewa-2083` → Firestore Database → Rules. Save a copy of your existing Rules, then paste the entire `firebase/rules.txt` from this ZIP and Publish. Do not combine fragments from old and new versions. Deploy `firebase/indexes.json` using the CLI when required.
3. **Sign in with the owner account and verify the email.** Google sign-in normally returns a verified identity. If the email/password account is unverified, use the verification email and then click **I have verified**. Reload the site after publishing Rules.

If a website update prompt appears, finish any active test and choose **Update now**. The new Service Worker cache is `sajilo-gk-v3-owner`. Updating only one JavaScript file can leave incompatible old cached modules; upload the complete folder.

## Where the controls are

- **Admin** button: website header, desktop sidebar, and mobile navigation drawer.
- `#/admin`: real counts, content links and recent activity. A failed count is **Unavailable**, never a fake zero.
- `#/admin/content`: examinations, subjects, chapters, topics, questions, legacy notes, test definitions, announcements, current affairs and formula sheets.
- `#/admin/materials`: structured learning materials with a student-view preview and draft/publish history.
- `#/admin/mappings`: shared examination/subject mappings.
- `#/admin/import`: JSON import preview, conflict handling, error report and export.
- `#/admin/users`: student access, premium days, suspension, reports and attempts. The primary owner can grant or revoke admin/editor/support roles through a student’s profile dialog.
- `#/admin/settings`: title, branding, defaults, registration, maintenance and feature settings.
- `#/admin/setup`: connection checks, login refresh, complete Rules copy/download and one-time setup instructions. This page remains reachable without loading the Firestore settings documents first.

An `admin` may manage the normal website configuration and students, an `editor` manages content, and `support` handles students/reports. Only the verified primary owner can delegate staff privileges. Revocation uses `enabled: false`. The primary owner cannot be disabled through the student access form.

## Why publishing Rules is necessary

Showing an Admin button in JavaScript does not authorize database access. The backend must recognize the verified owner’s Firebase Authentication token. Publishing the supplied Rules makes that policy effective on Firestore. A public Firebase web configuration cannot publish its own security policy.

The website handles ongoing content and student administration. Firebase project settings, authorized domains, enabling providers, publishing Rules and deploying indexes are infrastructure operations that require Firebase Console/CLI access.

## What was checked

The ZIP includes three executable check suites and their JSON results. These cover syntax, import resolution, learning algorithms, service flows, verified-owner identity, role boundaries, failed profile/role reads, and route resolution. The account reads in these tests are simulated. Live Firebase Rules semantics, real login, production deployment and browser visual acceptance have not been tested in your account.

No project data was deleted or reset by creating this ZIP. Do not delete your students or question collections to fix a permission error.
