# Form — Gym Tracker

A full-stack gym workout planning app built as a portfolio project. Create routines, add exercises with target sets and reps, and edit or delete your plans. The responsive dark dashboard uses live plan totals. History and Progress are clearly marked as future milestones; no workout statistics are fabricated.

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

Open http://localhost:5173. The API runs at http://localhost:8080/api/plans. Vite proxies `/api` to the backend, so no CORS configuration is needed in development. The first page load should show an empty plan list. Click **New plan**, add exercises, save, and refresh to check database persistence.

The standard Apache Maven Wrapper is included for macOS/Linux (`mvnw`) and Windows (`mvnw.cmd`). It downloads Maven 3.9.11 on first use. Select a Java 21 JDK with `JAVA_HOME`; the wrapper does not select a JDK for you. Check the active versions with `./mvnw -v`.

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

- Frontend: both API-service tests and the production build pass.
- Backend: Java 21 compilation, all five tests, and executable JAR packaging pass (`./mvnw verify`).
- Standard Apache Maven Wrapper 3.3.4 runs Maven 3.9.11 successfully.
- Docker Compose configuration validates.
- The running local REST API passed create, read, list, update, validation and delete checks. The disposable verification plan was removed; existing plans were preserved.
- The running frontend is reachable at localhost:5173.
- Docker socket access is denied in the agent environment, so container health and PostgreSQL restart durability still need checking from your own terminal. H2 testing does not establish PostgreSQL-specific compatibility.
- Local `.git` writes remain denied in the agent environment. Commits can be saved directly to GitHub through the connected integration, but the local folder must be connected separately.

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

1. Log workout sessions with actual weights, sets and reps.
2. Add session history and exercise progress charts using Recharts.
3. Add authentication and associate plans and sessions with users.
4. Add database migrations and PostgreSQL-specific integration tests.
