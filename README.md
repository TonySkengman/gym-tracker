# Form — Gym Tracker

A full-stack gym workout tracker built as a portfolio project. Create routines, log actual weights and reps for each set, and browse completed sessions in History. The responsive dark dashboard shows live plan and completed workout totals. Progress charts remain a future milestone.

## Stack

- React + Vite, JavaScript, Tailwind CSS, Lucide icons
- Recharts installed for the future progress milestone
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

After pulling backend changes, stop the old backend process with Ctrl+C and start it again; it does not reload Java changes automatically. Hibernate creates the new session tables without removing existing plans.

Open http://localhost:5173. The API runs at http://localhost:8080/api/plans. Vite proxies `/api` to the backend, so no CORS configuration is needed in development. The first page load should show an empty plan list. Click **New plan**, add exercises, save, and refresh to check database persistence.

The standard Apache Maven Wrapper is included for macOS/Linux (`mvnw`) and Windows (`mvnw.cmd`). It downloads Maven 3.9.11 on first use. Select a Java 21 JDK with `JAVA_HOME`; the wrapper does not select a JDK for you. Check the active versions with `./mvnw -v`.

## Log a workout

1. Click **Start workout** on a saved plan.
2. Enter weight in kilograms and actual reps for every planned set. Use `0` kg for bodyweight/no added weight. All sets require entries; skipping or adding sets is reserved for a later improvement.
3. Click **Finish workout**. After the server confirms the save, the app opens **History**.
4. Expand a completed session to see its exercises, weights and reps. The dashboard completed-workout count updates too.

You can minimize the workout and navigate elsewhere. **Resume workout** returns to the same session. An unfinished workout is stored in this browser's local storage and survives refreshes; it is not synced to the server or other devices. Private browsing or clearing browser data can remove drafts. Completed workouts are stored in the database. **Discard workout** asks before clearing a draft.

Saved sessions contain a snapshot of the plan and sets. Editing or deleting the original plan leaves history intact. A stable session UUID makes sequential retries return the original saved workout rather than add a duplicate. History is read-only in this milestone; session editing and deletion are not yet implemented.

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

Completion time is set on the server. Weight allows 0–2000 kg and up to two decimal places; actual reps must be integers from 1–100. Exercise names and targets are stored as a snapshot, with no foreign-key dependency on the source plan. Responses include an ordered flat list of sets with exercise and set numbers; repeated exercise names remain separate groups in History.

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

- Frontend: all eight API-service/draft tests and the production build pass. Browser verification covered starting, minimizing, restoring after refresh, and discarding a draft.
- Backend: Java 21 compilation, all nine tests, and executable JAR packaging pass (`./mvnw verify`). Workout tests cover validation, session persistence, ordering, duplicate retries and history surviving source-plan deletion.
- Standard Apache Maven Wrapper 3.3.4 runs Maven 3.9.11 successfully.
- Docker Compose configuration validates.
- The running local REST API passed create, read, list, update, validation and delete checks. The disposable verification plan was removed; existing plans were preserved.
- The running frontend is reachable at localhost:5173.
- Docker socket access is denied in the agent environment. H2 testing does not establish PostgreSQL-specific compatibility. New workout endpoints still need an end-to-end PostgreSQL check after restarting the backend; starting a separate Java HTTP server for that check was blocked by sandbox socket permissions.
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

1. Add exercise progress charts using Recharts.
2. Support adding/skipping sets and editing completed sessions.
3. Add authentication and associate plans and sessions with users.
4. Add database migrations and PostgreSQL-specific integration tests.
