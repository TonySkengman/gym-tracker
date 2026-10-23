# Form — Gym Tracker

A full-stack gym workout tracker built as a portfolio project. Create routines, log actual weights and reps for each set, and browse completed sessions in History. The responsive dark dashboard shows live plan and completed workout totals. The Progress page charts heaviest weight and training volume for each exercise. A Schedule calendar assigns saved plans to dates and shows the next upcoming workout on the dashboard.

## Stack

- React + Vite, JavaScript, Tailwind CSS, Lucide icons
- Recharts for exercise progress charts
- Java 21, Spring Boot 4.1.1, Maven, Spring Data JPA, Spring Security, Bean Validation
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

## Schedule workouts

Open **Schedule** to use the Monday-first month calendar. Select a day and click **Add workout**, choose a saved plan, and save. You can schedule different plans on the same day. A plan can only be assigned once per date; duplicate bookings return an error instead of appearing twice. Use the month arrows or **Today** to navigate. Each date shows scheduled-workout markers; the selected-day list shows full names and completion status. Click a workout marker/name in the calendar, the selected-day list or the Next workout card to open its plan details, including description, exercise order, target sets and target reps. The detail view shows the current saved plan, not the actual results from a completed session, and can start an uncompleted scheduled workout. Deleted plans show an unavailable message instead of invented details.

The **Next workout** card on both Schedule and Dashboard selects the earliest uncompleted booking on or after today. Same-day entries use the order they were added. Completed entries, past dates and deleted plans are excluded. Scheduling is date-only, without times or recurring bookings. Dates use the browser's local calendar rather than UTC timestamps, and the upcoming calculation checks for a new local date once per minute while the app is open.

- Start using the scheduled entry's **Start workout** button. The browser draft keeps a `scheduleId`, and saving the session marks that entry complete in the same backend transaction. An unrelated workout started from a plan card is not automatically matched to a calendar entry.
- The pencil button can move an uncompleted entry or assign another saved plan. Completed entries cannot be rescheduled; add a new booking instead.
- Removing a booking asks for confirmation and leaves completed History and Progress data intact.
- Deleting a completed workout from History reopens its linked booking. A past booking stays on the calendar but is not treated as upcoming.
- If a source plan is deleted, its booking stays visible by its saved name. It cannot be started or selected as the next workout until reassigned to an existing plan.
- If a booking was removed or reassigned while a draft workout was in progress, the workout still saves, without completing another plan's booking.

Restart the backend after updating so Hibernate can add `scheduled_workouts`. Existing plans and workout history are preserved.

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

Schema creation uses Hibernate `ddl-auto=update` for this learning milestone. Add versioned migrations before deployment. Accounts use Spring Security sessions, CSRF protection and BCrypt password hashes. Set `SESSION_COOKIE_SECURE=true` when serving over HTTPS in production. Password reset, email verification and login rate limiting are future deployment work.

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

### Schedule endpoints

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/api/schedule` | All entries ordered by date and ID |
| POST | `/api/schedule` | Assign `{ "planId": 1, "date": "2026-10-25" }`; returns 201 |
| PUT | `/api/schedule/{id}` | Change the date or plan of an uncompleted booking |
| DELETE | `/api/schedule/{id}` | Remove only the calendar entry; returns 204 |

Responses include `id`, `planId`, `planName`, a date-only `date`, `planAvailable`, and nullable `completedWorkoutId`. Plan existence and dates are validated on the server. Duplicate plan/date combinations return 409. `scheduleId` is optional in workout completion payloads; old clients and unscheduled sessions still work.

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

- Frontend: all 25 catalog/API-service/draft/progress/schedule tests and the production build pass. Progress and schedule date-boundary tests also pass in Europe/Stockholm and America/Los_Angeles. Schedule tests include leap years, Monday-first month padding, DST and upcoming selection. Static server rendering verified 42 calendar dates and selected-day actions. Browser automation was unavailable for the Schedule milestone, so its final visual and PostgreSQL flow still need a manual check. Browser checks covered real-data charts on desktop and a 390 px mobile viewport, exercise selection, date-range empty/error states and filter reset. Earlier checks covered starting, minimizing, restoring after refresh and discarding a draft.
- Backend: Java 21 compilation, all 20 tests, and executable JAR packaging pass (`./mvnw verify`). Tests cover validation, session persistence, ordering, duplicate retries, stable catalog identities and backfill, skip storage, edits that preserve timestamps, deletion cleanup and history surviving source-plan deletion. Full HTTP conversion/validation is exercised against real JPA through MockMvc without opening a network port. Schedule tests cover creation, sorting, rescheduling, duplicate/invalid bookings, completion links, reopening after session deletion, and preserving entries/history when their source records are removed.
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

1. Add versioned database migrations and PostgreSQL-specific integration tests.
2. Add exercise catalog rename/merge tools with deliberate history handling.
3. Add personal record highlights and data export/import.

## Manual check after this milestone

Restart the backend and refresh the frontend. Register or log in, then check that your account’s plans and History appear. Pre-account data requires the optional ownership migration below. In a temporary plan/session: choose a catalog exercise, create a custom exercise, add/remove a set, skip another exercise, finish the workout, edit a weight in History and verify Progress changes. Delete the temporary workout with confirmation and verify its chart point/count disappears. Do not use real sessions for disposable verification.

### Manual Schedule check

Restart the backend, refresh the app, then open **Schedule**. Add a temporary booking for today and a different plan tomorrow. Verify Dashboard shows today's booking first. Start and finish the first workout from the calendar, then verify the completed marker and next workout change. Delete that disposable session to check the booking reopens; remove the temporary bookings afterward. Also check month navigation and the calendar layout on your phone.

## Guest mode

The dashboard opens without requiring login. Guests can create/edit/delete plans, use the built-in 50-exercise catalog, add temporary exercises, schedule workouts, record sets, edit History and view Progress for the current visit. Guest data lives only in memory: it is not sent to the backend and is not stored in localStorage, sessionStorage or PostgreSQL. Refreshing, closing or leaving the app clears it.

The **Guest mode** notice and **Log in / Register** actions explain how to keep future training. Opening the account form and choosing **Continue as guest** preserves the current guest workspace and unfinished workout. Successful registration/login opens the account’s saved workspace and discards guest data; it does not automatically import guest records. Logout opens a fresh guest workspace. Guest functionality works even if the backend is unavailable; account access requires the backend and PostgreSQL.

Manual check: open while signed out, create a temporary plan, schedule and complete a workout, then check History/Progress. Open and cancel the login form to confirm the temporary work remains. Refresh to confirm all guest records and drafts disappear. Register or log in, save a plan and refresh to confirm account data persists. Log out to confirm it is absent from the guest workspace.

## Accounts and private data

To keep your training between visits, register with your name, email and password (8–72 characters, at most 72 UTF-8 bytes), then log in using your email and password. Registration signs you in automatically. Use **Log out** to end the session. Refresh restores an active session; sessions expire after 30 minutes without server activity. Passwords are hashed with BCrypt and never returned by the API. Authentication uses an HttpOnly, SameSite=Lax session cookie, not a browser-stored JWT.

Plans, calendar bookings, workout History and Progress belong to the signed-in user. Other users’ record IDs return 404. Exercise names form a shared catalog, seeded with 50 common gym exercises; signed-in users can add names. Unfinished browser drafts use separate keys per account and can be resumed after logging back in on the same browser. Old unowned browser drafts are not imported.

All data endpoints require authentication. For non-GET requests, fetch `/api/auth/csrf` first and send its `token` under the returned `headerName`, keeping the session cookie. Fetch a fresh token after login, registration or logout. The frontend handles this automatically through `services/auth.js`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/auth/csrf` | CSRF token and header name; available before login |
| POST | `/api/auth/register` | `{ "displayName": "Tony", "email": "tony@example.com", "password": "your-password" }`; 201 and signed-in user |
| POST | `/api/auth/login` | Email and password; 200 or 401 |
| GET | `/api/auth/me` | Current account ID, display name and email; 401 when signed out |
| POST | `/api/auth/logout` | Invalidate the session and expire its cookie; 204 |

### Existing data from before accounts

Existing database rows are preserved with no owner and hidden from registered users. They are never automatically assigned to the first person who registers. If **all unowned data in your local database is yours**, register your account, then explicitly assign that data once from the project root (replace the email with your registered email):

```sh
docker compose exec -T postgres psql -U gym -d gym_tracker -v email='tony@example.com' < backend/scripts/assign-legacy-data.sql
```

Use your configured database username/name if different. The transaction stops if the account does not exist and updates only unowned rows; it never transfers another account’s data. Refresh after running it. Back up important data before manually migrating ownership.

### Manual account check

1. Restart the backend, refresh the app and register account A.
2. Create a plan and calendar booking; finish a disposable workout and check History/Progress.
3. Log out, register account B and confirm those records are absent. Create a separate plan.
4. Log out and log back into A; confirm its data persisted and B’s plan is absent.
5. Start a workout as A, minimize it and refresh. Log out and into B; A’s draft must not appear. Log back into A to resume it.

Current verification: 52 frontend tests, 25 backend tests and both production builds pass. Automated authentication coverage uses the real Spring Security filter chain with H2: anonymous access, missing CSRF, hashed passwords, normalized email uniqueness, login errors, session rotation/logout, private list results and cross-account ID access. Actual PostgreSQL and browser interactions still need the manual check above.

Guest regression tests exercise the full temporary plan/schedule/history flow with network and browser storage disabled, verify visit isolation, and reject incomplete recorded sets.

### Planned rest between sets

Each exercise in the new/edit plan dialog has an optional **Rest (sec)** field. Enter 0–3600 seconds (for example, 90), or leave it blank for no target. Rest targets appear on plan cards, calendar plan details and the active workout screen. They are saved with account plans and remain temporary for guests. Existing plans have no rest target until you add one. Restart the backend after updating so Hibernate adds the nullable `plan_exercises.rest_seconds` column.

Plan API exercise objects accept optional `restSeconds` (integer or null). Updating a plan can change it or clear it with null. This is a planned duration; completed workout history continues to record actual weights and reps.

### Exercise muscles

All 50 built-in exercises include primary and secondary muscle labels. For example, bench press lists Chest as primary and Triceps/Front delts as secondary. Labels appear in the catalog, exercise picker, plan cards, scheduled plan details and active workout screen. Catalog search also matches muscle names.

Custom exercises accept optional comma-separated primary and secondary muscles (up to 8 labels per group, 40 characters per label). Unknown custom exercises show unspecified labels rather than guessing from the name. Metadata belongs to the shared exercise catalog; existing plan and history IDs are preserved. Restart the backend to create the muscle tables and backfill defaults. Previously assigned muscle labels are not overwritten on startup.

The API accepts optional `primaryMuscles` and `secondaryMuscles` arrays on `POST /api/exercises`, and returns them on catalog entries. Guest mode uses the same built-in metadata without network access. Default labels are stored in `backend/src/main/resources/exercise-muscles.json` and `frontend/src/services/defaultExercises.json`; a test checks they stay identical.

Labels use simplified training categories and assume typical technique; grip, stance and execution can change emphasis. Primary/secondary classifications differ between references. Reference examples: [StrengthLog bench press guide](https://www.strengthlog.com/bench-press/) and [NASM bench press guide](https://www.nasm.org/resource-center/exercise-library/barbell-bench-press).

### Plan muscle diagram

Click a plan title on Dashboard or Workout Plans, or a saved plan in Schedule, to open its details. The front/back full-body SVG highlights all labeled muscles in that plan: green for primary, orange for secondary, gray for other surface regions. The lists below provide a text equivalent. A muscle trained as primary by any exercise takes priority in the combined map; highlights do not represent intensity or set counts.

The illustration is a simplified surface map. Smaller/deeper muscles use nearby regions, and custom labels with no diagram mapping remain listed separately. Exercises missing muscle metadata are reported and do not receive guessed highlights. The diagram uses the same catalog in guest and account modes and needs no external image service.

### Previous workout values

The active workout logger shows each exercise’s last recorded weights and reps, the session date and source plan, plus a read-only **Previous** value beside each set. On narrow screens the comparison sits below the inputs. New values stay blank until you enter them; adding a set never invents an earlier value.

Comparison uses the most recent completed session at or before the active workout’s start time, across all plans. Catalog IDs take priority, with normalized-name matching for legacy records that lack an ID. Skipped exercises, invalid timestamps and the current session are excluded. Repeated exercise blocks retain separate comparisons. The feature works for saved accounts and the current guest visit; editing a completed workout does not show these suggestions. Loading and history errors are displayed without blocking workout entry.

The stylesheet is formatted into readable sections, with duplicate selector rules consolidated, superseded declarations removed and obsolete Next Workout layout styles deleted. Responsive declaration checks covered 14 viewport widths during the cleanup.

### Rest timer

While logging an active workout, press **Start rest** below an exercise after a set. It uses that exercise’s planned rest seconds, or 60 seconds if no target is set. A zero-second target displays **No rest planned**. Only one countdown runs at a time; starting another replaces the previous countdown.

The timer shows the exercise name and remaining time, with Pause, Start/Resume, Reset and Skip rest controls. Reset restores the full duration in a paused state. At zero, **Rest complete** appears; Reset starts preparation for another rest or Dismiss clears it. There is no browser-notification permission requirement.

The deadline keeps the countdown accurate while the workout is minimized or the tab is inactive. Account drafts preserve the timer across refresh; guest timers last only for the current visit. Finishing or discarding a workout clears its timer. This is a workout aid, not a recorded rest measurement, and it is hidden when editing completed History.
