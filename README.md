# Form — Gym Tracker

A full-stack gym workout tracker built as a portfolio project. Create routines, log actual weights and reps for each set, and browse completed sessions in History. The responsive dark dashboard shows live plan and completed workout totals. The Progress page charts heaviest weight and training volume for each exercise.

## Stack

- React + Vite, JavaScript, Tailwind CSS, Lucide icons
- Recharts for exercise progress charts
- Java 21, Spring Boot 4.1.1, Maven, Spring Data JPA, Bean Validation
- PostgreSQL 17 via Docker Compose

## Start locally

Prerequisites: Node.js 22.12+ (24 recommended), a Java 21 JDK, and Docker Desktop with its engine running. No global Maven installation is required. An internet connection is needed for uncached dependencies on first launch.

From the project root, start the database:

```sh
docker compose up -d --wait
```

In one terminal, start the backend:

```sh
cd backend
# macOS: select the installed Java 21 JDK
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
./mvnw spring-boot:run
```

In a second terminal, start the frontend:

```sh
cd frontend
npm ci --cache .cache/npm
npm run dev
```

After pulling backend changes, stop the old backend process with Ctrl+C and start it again; it does not reload Java changes automatically. Hibernate adds the new tables and nullable exercise identity columns without removing existing plans. The startup catalog importer links older records by normalized name and preserves their recorded names. Do not delete the database volume.

Open http://localhost:5173. The API runs at http://localhost:8080/api/plans. Vite proxies `/api` to the backend, so no CORS configuration is needed in development. The first page load should show an empty plan list. Click **New plan**, add exercises, save, and refresh to check database persistence.

The standard Apache Maven Wrapper is included for macOS/Linux (`mvnw`) and Windows (`mvnw.cmd`). It downloads Maven 3.9.11 on first use. Select a Java 21 JDK with `JAVA_HOME`; the wrapper does not select a JDK for you. Check the active versions with `./mvnw -v`.

## Log a workout

1. Click **Start workout** on a saved plan.
2. Enter weight in kilograms and actual reps for each performed set. Use `0` kg for bodyweight/no added weight. Use **Add set** or the trash button to adjust the set count (1–50 per exercise). Removing a filled set asks for confirmation. Use **Skip exercise** when an exercise was not performed; no fake values are required. At least one exercise with a recorded set is required to finish.
3. Click **Finish workout**. After the server confirms the save, the app opens **History**.
4. Expand a completed session to see its exercises, weights and reps. The dashboard completed-workout count updates too.

You can minimize the workout and navigate elsewhere. **Resume workout** returns to the same session. An unfinished workout is stored in this browser's local storage and survives refreshes; it is not synced to the server or other devices. Private browsing or clearing browser data can remove drafts. Completed workouts are stored in the database. **Discard workout** asks before clearing a draft.

Saved sessions contain a snapshot of the plan and sets. Editing or deleting the original plan leaves history intact. A stable session UUID makes sequential retries return the original saved workout rather than add a duplicate. In **History**, the pencil button opens the session editor so you can correct weights/reps, change the set count or mark an exercise skipped. Saving updates Progress immediately while preserving the original workout date and duration. The trash button asks for confirmation before deleting the session and its recorded/skipped exercise rows; Progress and completed-workout totals update too. Unsaved history edits are not stored in the browser draft.

## Exercise catalog

Open **Exercises** to search the shared catalog or add a custom exercise. Common exercises are seeded on first startup. Names are unique ignoring capitalization and repeated spaces; duplicates return a helpful error. Plans now use an exercise picker, with an inline **Create custom exercise** action for movements not already listed.

Plans, recorded sets and skipped exercises carry stable catalog IDs. On startup, the importer adds IDs to old plans and recorded sets by matching normalized names without changing historical names or recorded values. Re-running the importer does not create duplicate entries. Different spellings such as `Dumbell press` and `Dumbbell press` remain separate; the importer does not make uncertain guesses. The catalog currently supports browsing and adding exercises, not renaming, merging or deletion.

Skipped exercises are stored in a separate collection, with no weight/reps placeholders. They appear as **Skipped** in History and do not create zero-volume chart points. A pending draft keeps its unsent inputs when toggling skip off again; once a session is saved, skipped exercise values are intentionally absent. Unskipping a previously saved skipped exercise starts with one blank set.

## View exercise progress

Open **Progress** and select an exercise. The page uses completed sessions from the existing workout API; no additional backend endpoint or dependency installation is required.

- **Heaviest weight:** maximum recorded set weight for that exercise in each session.
- **Training volume:** sum of recorded weight × actual reps for that exercise in each session.
- **Summary:** matching session count, best set weight and total volume for the selected date range.
- **Date filters:** From and To include the full local calendar day; leave either blank for an open-ended range. **All dates** clears both date filters.
- **Session data:** expandable table with the underlying chart values for accessibility and checking calculations.

Every session remains a separate chart point, including multiple sessions on the same day. One session shows a single point and a prompt to log another session. Planned exercises with no logged sessions show an empty state. Progress uses catalog IDs across plans, so historical snapshot names do not change the exercise grouping. Legacy records without IDs fall back to normalized names until the startup importer has run. Bodyweight sets recorded at 0 kg contribute 0 to volume because body mass is not recorded.

The charts load only when opening Progress to keep the dashboard bundle smaller. The charts themselves use the existing workout API. The catalog and editable-history milestone adds backend endpoints, so restart the backend after updating.

## Configuration

Compose uses development defaults, so copying `.env.example` is optional. Its PostgreSQL port is bound only to localhost, and data survives restarts in a named Docker volume.

| Setting | Default |
| --- | --- |
| Database | `gym_tracker` |
| Username | `gym` |
| Password (local development only) | `gym_local_dev` |
| PostgreSQL port | `5432` |
| Backend port | `8080` |
| Frontend port | `5173` |

Root `.env` values configure Compose only. If you change database credentials or port, export the matching backend settings in the backend terminal:

```sh
export DB_URL=jdbc:postgresql://localhost:5432/gym_tracker
export DB_USERNAME=gym
export DB_PASSWORD=gym_local_dev
./mvnw spring-boot:run
```

PostgreSQL applies initial user/database settings only when creating its data volume. Changing `.env` later does not change existing database credentials. Stop the database with `docker compose stop`; `docker compose down` removes containers but preserves saved data. Avoid `docker compose down -v` unless you intend to delete all database data.

Schema creation uses Hibernate `ddl-auto=update` for this learning milestone. Add versioned migrations before deployment. This initial app has no authentication and is intended for local use only.

## Project structure

```text
frontend/
  src/
    components/PlanEditor.jsx  # Accessible native dialog and exercise editor
    services/plans.js          # REST API calls
    services/plans.test.js     # API contract and error handling tests
    App.jsx                    # Dashboard, navigation and plan list
    index.css                  # Tailwind and responsive styling
backend/
  src/main/java/com/tonyle/gymtracker/
    GymTrackerApplication.java
    plan/                      # Entity, DTOs, repository, controller, error handling
  src/main/resources/application.properties
  src/test/java/com/tonyle/gymtracker/ # Controller and JPA persistence tests
  pom.xml
  mvnw / mvnw.cmd
  .mvn/wrapper/maven-wrapper.properties
docker-compose.yml
.env.example
.gitignore
```

## API

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/api/plans` | List plans, newest first |
| GET | `/api/plans/{id}` | Get a plan, or 404 |
| POST | `/api/plans` | Create, returning 201 and a Location header |
| PUT | `/api/plans/{id}` | Replace a plan and its exercises |
| DELETE | `/api/plans/{id}` | Delete, returning 204 |

Create/update payload:

```json
{
  "name": "Upper body",
  "description": "Strength session",
  "exercises": [
    { "name": "Bench press", "targetSets": 3, "targetReps": 8 },
    { "name": "Seated row", "targetSets": 3, "targetReps": 10 }
  ]
}
```

Names are required (100 characters maximum), descriptions allow 500 characters, and each plan requires 1–50 exercises. Sets must be 1–50; reps must be 1–100. Validation runs on the backend as well as the form. The UI reports server failures and never pretends a failed save was persisted. There is no local-storage fallback.

### Workout endpoints

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/api/workouts` | Completed sessions, newest first |
| GET | `/api/workouts/{uuid}` | One saved session, or 404 |
| PUT | `/api/workouts/{uuid}` | Replace recorded/skipped exercises; preserve original timestamps |
| DELETE | `/api/workouts/{uuid}` | Delete a session and its dependent rows; 204 or 404 |
| POST | `/api/workouts` | Complete a session; 201 for a new UUID, 200 for a previously saved UUID |

Example completion payload (use a new UUID for each workout):

```json
{
  "id": "4b6ca5aa-e309-4cff-94d3-d1e1e7519669",
  "planId": 1,
  "planName": "Upper body",
  "startedAt": "2026-01-01T10:00:00Z",
  "exercises": [
    { "name": "Bench press", "targetReps": 8, "sets": [
      { "weight": 12.5, "reps": 8 },
      { "weight": 12.5, "reps": 6 }
    ] }
  ]
}
```

Completion time is set on the server on creation and preserved on updates. The body UUID must match the URL for PUT. Weight allows 0–2000 kg and up to two decimal places; actual reps must be integers from 1–100. Exercise names and targets are stored as a snapshot, with no foreign-key dependency on the source plan. Responses include an ordered flat list of recorded sets with exercise IDs and exercise/set numbers, plus a separate `skippedExercises` array. Repeated exercise occurrences remain separate in History. For a skipped exercise, send `skipped: true` and `sets: []`; performed exercises require at least one set. The server rejects sessions where everything is skipped. `exerciseId` is optional for backward compatibility; supplying it selects the canonical catalog exercise.

### Catalog endpoints

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/api/exercises` | Alphabetical catalog of exercise IDs and names |
| POST | `/api/exercises` | Create from `{ "name": "Cable row" }`; 201, 400 for invalid input or 409 for a duplicate |

Plan exercise payloads and responses now also carry `exerciseId`. Existing clients that only send exercise names remain supported.

## Checks

```sh
cd frontend
npm test
npm run build
```

```sh
cd backend
./mvnw test
./mvnw package
```

Backend controller tests use a mocked repository and cover create responses, invalid requests, exercise replacement, deletion and missing plans. A separate Spring Boot integration test uses an in-memory H2 database in PostgreSQL compatibility mode to check real JPA persistence, exercise ordering, updates and deletion across separate transactions. H2 is test-only; the application still uses PostgreSQL. Mockito uses its interface proxy mock maker, avoiding Java agent attachment for repository mocks.

### Verification status

- Frontend: all 19 catalog/API-service/draft/progress tests and the production build pass. Progress date-boundary tests also pass in Europe/Stockholm and America/Los_Angeles. Browser checks covered real-data charts on desktop and a 390 px mobile viewport, exercise selection, date-range empty/error states and filter reset. Earlier checks covered starting, minimizing, restoring after refresh and discarding a draft.
- Backend: Java 21 compilation, all 15 tests, and executable JAR packaging pass (`./mvnw verify`). Tests cover validation, session persistence, ordering, duplicate retries, stable catalog identities and backfill, skip storage, edits that preserve timestamps, deletion cleanup and history surviving source-plan deletion. Full HTTP conversion/validation is exercised against real JPA through MockMvc without opening a network port.
- Standard Apache Maven Wrapper 3.3.4 runs Maven 3.9.11 successfully.
- Docker Compose configuration validates.
- The running local REST API passed create, read, list, update, validation and delete checks. The disposable verification plan was removed; existing plans were preserved.
- The running frontend is reachable at localhost:5173.
- Docker socket access is denied in the agent environment. H2 testing does not establish PostgreSQL-specific compatibility. New catalog, update and delete endpoints still need an end-to-end PostgreSQL check after restarting the backend; starting a separate Java HTTP server for that check was blocked by sandbox socket permissions.
- Local Git setup and PostgreSQL restart durability were subsequently verified by the project owner. Agent writes to `.git` remain restricted; direct GitHub commits do not update the local Git index or branch.

### Connect this existing folder to GitHub

The GitHub repository already contains the initial project. In your own terminal, from the project root, run the following **only if this folder does not already contain its own `.git` directory**:

```sh
git init -b main &&
git remote add origin https://github.com/TonySkengman/gym-tracker.git &&
git fetch origin main &&
git reset --mixed origin/main
```

This connects local history to the remote branch and leaves your working files in place. It does not delete your files. Review `git status` afterward; any local differences remain uncommitted. Once connected, future changes can use the normal add, commit and push workflow.

To check PostgreSQL restart persistence, create a disposable plan in the app, run `docker compose restart postgres`, wait for the database to become healthy, then refresh the app. Delete that plan after verification. Never remove the data volume to test persistence.

## Next milestones

1. Add authentication and associate plans and sessions with users.
2. Add versioned database migrations and PostgreSQL-specific integration tests.
3. Add exercise catalog rename/merge tools with deliberate history handling.
4. Add previous-session suggestions while logging workouts.

## Manual check after this milestone

Restart the backend and refresh the frontend. Check that existing plans and History still appear. In a temporary plan/session: choose a catalog exercise, create a custom exercise, add/remove a set, skip another exercise, finish the workout, edit a weight in History and verify Progress changes. Delete the temporary workout with confirmation and verify its chart point/count disappears. Do not use real sessions for disposable verification.
