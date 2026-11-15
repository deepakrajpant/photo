# Sajilo GK import schema 1.0

UTF-8 JSON supports Nepali and English. Arrays of records are processed through paginated/chunked application operations; no complete question bank is stored as a single Firestore document.

## Nested syllabus format

```json
{
  "schemaVersion": "1.0",
  "exam": "NTC",
  "examId": "ntc",
  "subject": "Science",
  "subjectId": "science",
  "chapters": [{
    "id": "foundations",
    "title": "Foundations",
    "notes": {
      "status": "draft",
      "contentHtml": "<h2>Units</h2><p>Read and recall.</p>",
      "keyFacts": [],
      "commonMistakes": [],
      "examTips": []
    },
    "topics": [{
      "id": "electric-current",
      "title": "Current",
      "questions": [{
        "id": "q-current-unit",
        "questionText": "What is the SI unit of current?",
        "options": ["ampere", "volt"],
        "correctOption": 0,
        "shortAnswer": "ampere",
        "explanation": "Current is measured in amperes.",
        "memoryTrick": "Current → ampere",
        "level": 1,
        "importance": "high",
        "tags": ["units"],
        "source": {"title": "Author-created practice"},
        "verification": "predicted",
        "mcq": true,
        "status": "draft"
      }],
      "testSets": []
    }]
  }]
}
```

Question `correctOption` is **zero-based**. The editor displays a one-based answer number for convenience and converts it before saving.

Question fields require nonempty text, 2–6 nonempty options, a valid answer index, level 1/2/3, importance low/medium/high and valid hierarchy IDs. Source verification labels must be truthful. `official`, `verified_pyq` and `predicted` are distinct.

Nested imports inherit parent IDs. Existing hierarchy IDs are compared in the preview. Notes and questions default to draft when status is omitted. Explicit publication is supported.

## Versioned flat export/import

```json
{
  "schemaVersion": "1.0",
  "records": [
    {"collection": "exams", "id": "ntc", "data": {"title": "NTC", "status": "published", "sortOrder": 0}},
    {"collection": "notes", "id": "foundations", "data": {"title": "Foundations", "examId": "ntc", "subjectId": "science", "chapterId": "foundations", "contentHtml": "<p>Notes</p>", "status": "draft", "access": "free"}}
  ]
}
```

Questions exported **without** answer keys are suitable for sharing, but cannot be round-trip imported as complete questions. To create a restorable question export, select **Include answer key** as an editor/admin. CSV is an inspection/export format; JSON is the supported import format.

## Conflict modes

| Mode | Existing ID | Missing ID |
|---|---|---|
| Add new | Error | Create |
| Update existing | Update after version check | Error |
| Add or update | Update after version check | Create |
| Skip duplicates | Skip | Create |

Validation records the current version. A concurrent edit causes rejection rather than an unexpected overwrite. Conflicting repeated IDs within uploaded files block commit. Matching repeated hierarchy records are deduplicated.

Writes are atomic per content record together with its solution/revision/search/audit records. The complete import is **not** one transaction. Partial failures and cancellation retain completed records and record a job summary. Download errors, correct the failed records, and validate again before retrying. Do not assume cancellation rolls back committed records.

## Test-set rules

`selectionRules` contains `questionCount` (1–100), `levels` (subset of 1/2/3), `levelMix` (`l1`, `l2`, `l3` numeric weights), `subjectIds`, `topicIds`, and `importanceMin`. `scoring` contains `marksPerQuestion`, `negativeMarks` and `passPercentage`; optional `targetFullMarks` scales the final score. `durationSeconds` must be 60–14400.

## Storage model

Top-level: `users`, `exams`, `subjects`, `chapters`, `topics`, `notes`, `questions`, `testSets`, `mockTests`, `announcements`, `currentAffairs`, `formulaSheets`, `questionReports`, `importJobs`, `adminRoles`, `adminAuditLogs`, `appSettings`, `searchEntries`.

User subcollections: `access`, `questionProgress`, `bookmarks`, `revisionSchedule`, `studySessions` and their `events`, `personalNotes`, `chapterProgress`, `testAttempts` and their `items`, `dailyActivity`, `summary`, `plans`, `notifications`, `achievements`.

Content subcollections: `solutions` for questions, `revisions` for editorial history, `drafts/current` for staged edits to published content, and test item documents for explicitly selected questions.

`createdAt`/`updatedAt` are timestamps. Editorial records have author IDs and a numeric version. All content links use stable string IDs, not display labels. Nepal calendar keys are `YYYY-MM-DD`; timestamps remain absolute instants. Published live notes remain available while a new draft is staged.

Consult source validators and `firebase/rules.txt` for the enforceable field definitions. Do not import administrative roles or protected premium records through the content importer.

## Version 2 learning extensions

The bundled sample now uses flat records. Additional collection: materials. Material fields: title, description, examId (legacy owner), subjectId, chapterId, topicId, level (1/2/3), importance (low/medium/high), access (free/premium), status and blocks. Source is {title,url}. Block IDs are stable across edits. Use 1–60 blocks with types heading/text/list/table/image/audio/youtube/link/facts/mistakes/tips/summary. Images require alt text and audio requires a transcript. Published material requires a source title.

subjects/{id}.examIds is the canonical multi-examination mapping. Private additions under users/{uid}: subjects, materialProgress, learningState/current and savedItems. The user profile stores selectedExamIds, pendingExamIds and onboardingComplete/onboardingStep. savedItems has separate favourite, revision and personalImportant flags. Material review schedule IDs use the material- prefix and entityType/entityId.

Reading counts explicitly marked eligible material units of the current version. Mastery counts eligible current-version questions meeting the separate-day recall criterion; reading never awards mastery. Subject/chapter percentages aggregate counts, not rounded averages. Unattempted eligible questions remain in the mastery denominator.

## Version 3 owner and staff access

The primary owner is the verified Firebase Authentication email deepakrajpant978@gmail.com. Both UI permissions and server Rules check this identity. The primary owner does not require a role document. Delegated roles remain in adminRoles/{uid}; only the verified primary owner may create/update validated admin/editor/support records for other UIDs. Fields: role, enabled, assignedBy, assignedAt, createdAt, updatedAt. Disabling uses enabled=false; deleting role records from the frontend is denied. No client-editable users.role field is trusted.
