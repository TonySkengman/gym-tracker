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
./mvnw spring-boot:run
```

In a second terminal, start the frontend:

```sh
cd frontend
npm ci --cache .cache/npm
npm run dev
```

Open http://localhost:5173. The API runs at http://localhost:8080/api/plans. Vite proxies `/api` to the backend, so no CORS configuration is needed in development. The first page load should show an empty plan list. Click **New plan**, add exercises, save, and refresh to check database persistence.

The local Maven launcher selects Java 21 automatically on macOS when `JAVA_HOME` is unset. On other systems, or if `JAVA_HOME` already points to another version, select Java 21 yourself:

```sh
# macOS, in the backend terminal
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
./mvnw -v
```

`backend/mvnw` is a small workspace-local Maven bootstrap, with its distribution URL in `.mvn/wrapper/maven-wrapper.properties`. It uses an existing Maven or downloads Maven 3.9.11 into `backend/.tools`; dependencies stay in `backend/.cache/repository`. It is not the generated Apache Maven Wrapper: network restrictions prevented downloading the generator. Once online, you can replace it with the standard generated wrapper:

```sh
cd backend
./mvnw org.apache.maven.plugins:maven-wrapper-plugin:3.3.4:wrapper -Dtype=only-script -Dmaven=3.9.11
chmod +x mvnw
```

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
  src/test/java/com/tonyle/gymtracker/PlanControllerTest.java
  pom.xml
  mvnw
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

Backend controller tests use a mocked repository and do not need a running database. They cover create responses, invalid requests, exercise replacement, deletion and missing plans. PostgreSQL persistence still requires a manual end-to-end check with Docker running.

### Initial setup verification

- Frontend dependencies installed from the existing npm cache; lockfile included.
- Frontend production build passed.
- Two frontend API-service tests passed.
- Docker Compose configuration and Maven launcher shell syntax passed validation.
- Java 21 is installed, though the system default was Java 25.
- Backend source was scaffolded manually because Spring Initializr was unreachable.
- Backend tests/build could not run: the required Bean Validation artifacts were not cached, and DNS/network access to Maven Central was unavailable.
- The Maven bootstrap download was also blocked by DNS/network restrictions.
- Database startup and persistence were not verified because the Docker engine was stopped.
- Browser verification was blocked because this execution environment refused the Vite server's local port binding (`EPERM`). Run the launch commands in your own terminal.
- Git initialization was blocked by workspace permissions on `.git`. Run the following from the project root in your own terminal:

```sh
git init -b main
git add .
git commit -m "Set up gym tracker with workout plan management"
```

## Next milestones

1. Log workout sessions with actual weights, sets and reps.
2. Add session history and exercise progress charts using Recharts.
3. Add authentication and associate plans and sessions with users.
4. Add database migrations and database integration tests.
