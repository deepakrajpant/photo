# Firebase and GitHub Pages setup

## 1. Firebase project

Use the existing **loksewa-2083** Firebase project. The supplied public web configuration is already in `assets/js/firebase.js`. Do not put service-account JSON, administrative credentials or private API secrets in this repository.

In Firebase Console:

1. Enable Authentication → Email/Password and Google providers.
2. Set the project support email for Google sign-in.
3. Add `localhost`, `127.0.0.1` where applicable and your actual GitHub Pages/custom domain to Authentication → Settings → Authorized domains. Domains do not include paths.
4. Create a Firestore **Standard edition** database if the project does not already have one. Choose the location deliberately; do not replace or reset an existing database.
5. Review existing Rules and collections before deploying. This package is intended for a dedicated Sajilo GK database schema. Back up existing important data before replacing Rules.

## 2. Deploy Rules and indexes

Install the Firebase CLI using the official Firebase setup instructions. In the unzipped `sajilo-gk` folder:

```sh
firebase login
firebase deploy --only firestore:rules,firestore:indexes --project loksewa-2083
```

Wait for indexes to finish building. If an unsupported combination of filters returns an index error, inspect the developer console as administrator, create the required index, and add it to `firebase/indexes.json`. Do not display raw error links to students.

Deployment is an explicit operator step; this ZIP does not alter your Firebase project by itself.

## 3. Primary administrator

The verified Firebase account **deepakrajpant978@gmail.com** is the primary owner. Publish the current firebase/rules.txt first. Sign in with this exact account, verify the email and refresh the login. No manual adminRoles document is required for the primary owner.

The Admin button appears in the header, sidebar and mobile drawer. If reads are blocked, open #/admin/setup to copy the bundled Rules and check the connection. This page does not depend on loading appSettings.

Grant or revoke delegated admin/editor/support access from Admin → Students → View student → Staff permissions. Only the verified primary owner can write these protected role records; normal students and delegated staff cannot promote themselves. Suspending a delegated staff account also blocks its backend staff access.

Read UPDATE-FIRST.md for the complete update sequence.

## 4. Seed content

Open `#/admin/import`. Load the included sample, review planned records, then commit in **Add new** mode. Importing it again does not silently overwrite records. To intentionally replace matching records, validate again and choose **Add or update**.

Add NEA and General Loksewa exams through the content editor, then subjects, chapters and topics. Published questions must refer to the matching hierarchy. Notes use the chapter ID as their document ID.

Images use HTTPS URLs or repository asset paths supported by the editor. Firebase Storage uploads are not required. Choose stable image hosting and provide descriptive alt text.

## 5. GitHub Pages

1. Create a repository named `sajilo-gk`.
2. Upload the **contents** of this folder to the repository root. `index.html` must be at the publishing root.
3. In Settings → Pages choose **Deploy from a branch**, branch `main`, folder `/ (root)`.
4. Open `https://YOUR_USERNAME.github.io/sajilo-gk/` after deployment completes.
5. Add `YOUR_USERNAME.github.io` to Firebase Auth authorized domains.
6. Test `#/study`, refresh a deep link, sign in using both providers, and install the PWA from a supported browser.

Hash routing avoids server rewrite requirements. Keep relative asset paths and the repository folder intact. No npm build step is required for deployment.

## 6. Security and acceptance before launch

- Run the checks in `QA.md` with a normal verified user, a second user and an administrator.
- Test Rules in the Firebase Emulator Suite before public launch. Local emulator wiring can be added by calling `connectAuthEmulator` and `connectFirestoreEmulator` in a separate development configuration; never silently point this production configuration at an emulator.
- Review Auth password policy and email templates.
- Consider Firebase App Check after testing the chosen provider, domain and quota. App Check complements Rules; it is not a replacement for authorization or abuse control.
- Review GitHub Pages terms, privacy notice, consent and your content licensing before accepting real students.
- Use trusted grading if examination integrity matters. Client-side hashes cannot protect a small MCQ answer space.

## 7. Updates

Bump the `VERSION` value in `sw.js` whenever deploying changed assets. The application offers an update prompt; finish active tests before applying it. Keep old versioned solution documents for historical attempts. Do not delete question solution history while attempts reference it.

Firebase SDK imports are pinned to the version you requested. Test any SDK update before changing all imports consistently.
