# Local setup on Windows (STS / Eclipse + Docker Desktop)

## 0. Prerequisites
- JDK **21** (Temurin recommended), Docker Desktop (Engine running), Node.js 20+, STS or Eclipse with Maven (m2e).
- Extract the zip to a short path without spaces (e.g. `C:\arqon`). All commands below run from the folder that contains `pom.xml`.

## 1. Import into STS
File > Import > Maven > **Existing Maven Projects** > select the ROOT folder (the one with `pom.xml`) > tick all > Finish.
Projects: `arqon` (= arqon-parent), `arqon-common`, `arqon-security`, `arqon-core` (the app), `arqon-api-gateway` (optional).
Window > Preferences > Java > Installed JREs: add JDK 21 and make it default. Select all projects > Alt+F5 > Force Update.

## 2. Database + test inbox (PostgreSQL and Mailpit in Docker)
Mailpit catches invitation e-mails: open http://localhost:8025 to see them.
```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-db.ps1     # first start / normal start
powershell -ExecutionPolicy Bypass -File scripts\reset-db.ps1     # WIPES data; use after setup changes or auth errors
```

## 3. Build once
Right-click `arqon` > Run As > Maven build... > Goals `clean install -DskipTests` > Run. Expect BUILD SUCCESS.

## 4. Run the backend
`arqon-core` > `com.arqon.core.ArqonCoreApplication` > Run As > Spring Boot App.
Check http://localhost:8081/api/v1/system/ping and http://localhost:9081/actuator/health.

## 5. Run the frontend
```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-frontend.ps1
```
Open http://localhost:5173/login — `admin@arqon.local` / `ChangeMe-Local-12345!` (LOCAL ONLY).

## 6. Tests
Right-click `arqon` > Run As > Maven build... > Goals `clean verify` (Docker must be running; first run downloads images and can take 5-10 min).
Frontend: `cd frontend\arqon-web; npm test`.

## Troubleshooting
| Symptom | Cause / fix |
|---|---|
| `Connection to localhost:5432 refused` | Postgres not running. Start Docker Desktop, run `scripts\start-db.ps1`. |
| `invalid value for parameter "TimeZone": "Asia/Calcutta"` | Fixed in code (app forces UTC). If you see it again, make sure you run `ArqonCoreApplication` from this version. |
| `password authentication failed for user "arqon_app"` | Old DB volume without the app role: run `scripts\reset-db.ps1`. |
| `TestEngine ... failed to discover tests` / `NoClassDefFoundError` for a test class | Stale compiled classes. Delete `services\arqon-core\target`, then Project > Clean and run `clean verify`. |
| `Could not find a valid Docker environment` / all `*IT` tests error at `AbstractIT.<clinit>` | Docker Desktop must be running. The project sets Docker API 1.44 for `mvn verify` (property `docker.api.version` in arqon-core/pom.xml). If you run integration tests from STS (Run As > JUnit), create `%USERPROFILE%\.docker-java.properties` containing `api.version=1.44`. On an old Docker Engine (< 25) use `-Ddocker.api.version=1.41`. |
| Red X on `arqon-core` | Problems view: usually stale Maven data. Alt+F5 with Force Update, then `clean install -DskipTests` on `arqon`. |
| Port 8081 / 5432 / 5173 already in use | Stop the other program or the earlier run (Console > red stop button). |
| Maven runs on JDK 25 | Works for building, but use JDK 21 for runs/tests (Run Configuration > JRE tab) to match the project target. |
