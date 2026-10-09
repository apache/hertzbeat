Please add the corresponding e2e (aka end-to-end) test cases if you add or update APIs.

## How to work
* Start and watch the [Docker Compose](https://docs.docker.com/compose/) environment
  * The Compose file is `e2e/docker-compose.yml`
  * The `testing` container uses [api-testing](https://github.com/LinuxSuRen/api-testing)
  * The main test definition file is `e2e/testsuite.yaml`
  * Before starting the suite locally, build the `apache/hertzbeat:test` image from the repository root:

    ```bash
    mvn clean -B package -Prelease -Dmaven.test.skip=true --file pom.xml
    docker build -t apache/hertzbeat:test -f script/docker/server/Dockerfile ./dist
    ```

* Run the E2E tests via [api-testing](https://github.com/LinuxSuRen/api-testing)
  * The test cases run from top to bottom
  * You can add the necessary assertions there
  * Test data files are under `e2e/data/`
  * The test report is generated at `e2e/report/report.md`
  * HertzBeat logs are written to `e2e/logs/`

## Run locally
Please follow these steps if you want to run the E2E tests locally.

> Please make sure that Docker Compose v2 is installed

* Build the local `apache/hertzbeat:test` image from the repository root
* Change the directory to `e2e`, then run:

  ```bash
  docker compose up --exit-code-from testing --remove-orphans
  ```

* If your environment uses the standalone Compose binary, use `docker-compose` instead of `docker compose`
* After the run, check `e2e/report/report.md` and `e2e/logs/` for the test result and runtime logs
