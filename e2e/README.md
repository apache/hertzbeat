Please add the corresponding e2e (aka end-to-end) test cases if you add or update APIs.

## How to work
* Start and watch the [docker-compose](https://docs.docker.com/compose/) via [the script](script/start.sh)
* Run the e2e testing via [api-testing](https://github.com/LinuxSuRen/api-testing)
  * It will run the test cases from top to bottom
  * You can add the necessary asserts to it

## Run locally
Please follow these steps if you want to run the e2e testing locally.

> Please make sure you have installed docker-compose v2

* Change the directory to `e2e`, then execute `./script/start.sh`
