---
id: package-deploy
title: Install HertzBeat via Package
sidebar_label: Install via Package
---

This guide describes the HertzBeat 2.0 alpha/community preview. Use a fresh installation for evaluation and read the [upgrade boundaries](upgrade.md) before reusing an existing database.

## Prerequisites

- Java 25. The package does not include a JDK. The Bash launcher uses `java` from `PATH`, or `java/bin/java` inside the extracted installation when present.
- Bash, `curl`, and permission to write the installation's `data`, `config`, and `logs` directories. The server launcher uses curl for a bounded HTTP startup check.
- A reachable GreptimeDB service for the three-signal workflow, with its HTTP endpoint, gRPC endpoint, database and credentials when required.
- A metadata database: embedded H2 for local evaluation, or MySQL/PostgreSQL. Local alpha acceptance covered H2, MySQL 8.4, PostgreSQL 17 and GreptimeDB 1.1.4; this is not a guarantee for every database version or operating-system/native distribution.

These commands use the Bash server package. Use the matching artifact and instructions for other platforms. Check Java before starting:

```shell
java -version
curl --version
```

## Install and complete Setup

1. Obtain the alpha package from the [download page](/docs/download) or the candidate supplied for evaluation. Verify its published signature/checksum when available. For a source build, record the source snapshot and build a production frontend plus the startup package; a Vite development server is not the release artifact.
2. Extract into a new directory. Replace the filename below with the selected package:

   ```shell
   tar -xzf apache-hertzbeat-2.0.0-bin.tar.gz
   cd apache-hertzbeat-2.0.0-bin
   ./bin/startup.sh
   ```

3. Open `http://<server>:1157/setup`. An initial **Setup required** message means the setup service is available; it does not mean installation is complete. If Setup requests an unlock code, read the installation-local `data/config/setup-unlock-code` as the installation owner. Keep this credential private.
4. Configure metadata storage and GreptimeDB, then run the connection checks. For the packaged H2 baseline use `jdbc:h2:./data/hertzbeat;MODE=MYSQL`. The MySQL compatibility mode is required by this alpha's H2 schema initialization. Use endpoints reachable from the HertzBeat server; in a container, `127.0.0.1` refers to that container.
5. Create your administrator, review optional public-access/notification settings and acknowledge applicable warnings. H2 is an evaluation option, not a production recommendation. Complete Setup and sign in with the account you created. Do not assume an `admin/hertzbeat` or other built-in password.
6. Configure the advertised OTLP addresses for clients outside the server. A browser URL and an OTLP HTTP ingestion endpoint are different addresses; use the generated instrumentation guide rather than guessing an endpoint path.

Keep the packaged `config/application.yml` imports intact. Setup writes managed configuration under the installation's `data/config`; explicit operator environment/command-line/external-file overrides retain their precedence. Copying all classpath defaults into the external configuration can unintentionally override later Setup changes.

The server package includes the metadata JDBC dependencies. If a custom build omits a driver, supply its compatible driver through `ext-lib` before startup instead of changing a running package.

## Startup and troubleshooting

The Bash launcher defaults to port 1157 and a 120-second startup deadline. To choose another port or allow a longer startup:

```shell
SERVER_PORT=1257 START_TIMEOUT=180 ./bin/startup.sh
```

`SERVER_PORT` also supplies Spring Boot's server port. Keep other explicit port settings consistent. `JAVA_OPTS` and `JAVA_MEM_OPTS` accept whitespace-separated JVM arguments; retain the launcher's required Arrow JVM access options when using another launcher.

```shell
./bin/startup.sh status
curl --fail http://127.0.0.1:1157/api/setup/status
./bin/shutdown.sh
```

The `status` command checks the process, not signal health. A listening socket alone does not prove successful initialization. Inspect `logs/startup.log` and Setup status after an exited process, deadline failure or `recovery_required` state. Correct endpoint, credential, file-permission or schema compatibility problems before retrying. Do not repair Flyway checksums or replace runtime JARs to conceal a failed initialization.

## Unattended evaluation or CI

Use the existing unattended Setup workflow for automation. Supply separate nonempty metadata and administrator password files, owned and readable only by the account running HertzBeat, for example mode `0600`. Do not place plaintext password properties alongside `password-file`. Keep secrets out of the repository and CI output.

Add these settings to the active configuration while retaining the packaged imports. Adjust paths and Greptime endpoints to your deployment:

```yaml
hertzbeat:
  setup:
    unattended:
      enabled: true
      acknowledged-warnings: H2_NON_PRODUCTION
    metadata:
      kind: H2
      jdbc-url: 'jdbc:h2:./data/hertzbeat;MODE=MYSQL'
      username: sa
      password-file: /run/secrets/hertzbeat-metadata-password
    telemetry:
      grpc-endpoints: 127.0.0.1:4001
      http-endpoint: http://127.0.0.1:4000
      database: public
    administrator:
      username: admin
      password-file: /run/secrets/hertzbeat-administrator-password
```

If Greptime requires authentication, also supply `hertzbeat.setup.telemetry.username` and `hertzbeat.setup.telemetry.password-file`. Unattended Setup uses the same validators and durable phases as the UI; wait for `/api/setup/status` to report `complete`, then verify login. It does not bypass failed connection checks, recovery or required warning acknowledgements. Use an administrator password compatible with the configured BCrypt encoder, including its 72-byte input ceiling.

## Verify the first data

- **Agentless MySQL:** create a MySQL monitor using a least-privilege account on a reachable target, run detection, then check fresh current and historical collection values. This target account is separate from the HertzBeat metadata database account.
- **OTel Java application:** select the Java application recipe, use its generated configuration with the official OpenTelemetry Java agent, generate application requests and inspect the first metrics, traces and correlated logs. Each signal must actually arrive; one received signal does not prove all three work.
- A first-signal check observes a fixed window. After stopping an emitter, start a new check and inspect exporter errors. A previously received signal is not evidence of continued reporting.

A separately deployed Collector is optional for these reference paths. Its connectivity, registration, identity and advertised ingestion addresses require their own configuration. This local acceptance does not establish collector-cluster high availability or coverage of every catalog recipe.
