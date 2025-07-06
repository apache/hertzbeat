---
id: 'contribution'
title: 'Contributor Guide'
sidebar_position: 0
---

<!--
Licensed to the Apache Software Foundation (ASF) under one or more
contributor license agreements.  See the NOTICE file distributed with
this work for additional information regarding copyright ownership.
The ASF licenses this file to You under the Apache License, Version 2.0
(the "License"); you may not use this file except in compliance with
the License.  You may obtain a copy of the License at

https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

> We are committed to maintaining a happy community that helps each other, welcome every contributor to join us!

### Kinds of Contributions

> In the HertzBeat community, there are many ways to contribute:

- 💻**Code**: Can help the community complete some tasks, write new features or fix some bugs;

- ⚠️**Test**: Can come to participate in the writing of test code, including unit testing, integration testing, e2e testing;

- 📖**Docs**: Can write or Documentation improved to help users better understand and use HertzBeat;

- 📝**Blog**: You can write articles about HertzBeat to help the community better promote;

- 🤔**Discussion**: You can participate in the discussion of new features of HertzBeat and integrate your ideas with HertzBeat;

- 💡**Preach**: Can help publicize or promote the HertzBeat community, speak in meetup or summit;

- 💬**Suggestion**: You can also make some suggestions to the project or community to promote the healthy development of the community;

More see [Contribution Types](https://allcontributors.org/docs/en/emoji-key)

Even small corrections to typos are very welcome :)

### Getting HertzBeat up and running

> To get HertzBeat code running on your development tools, and able to debug with breakpoints.
> This is a front-end and back-end separation project. To start the local code, the back-end manager and the front-end web-app must be started separately.

#### Backend start

1. Requires `maven3+`, `java17` and `lombok` environments
2. (Optional) Modify the configuration file: `manager/src/main/resources/application.yml`
3. Execute under the project root directory: `mvn clean install -DskipTests`
4. Add VM Options: `--add-opens=java.base/java.nio=org.apache.arrow.memory.core,ALL-UNNAMED`
5. Start `springboot manager` service: `manager/src/main/java/org/apache/hertzbeat/hertzbeat-manager/Manager.java`

#### Frontend start

1. Need `Node Yarn` Environment, Make sure `Node.js >= 18`

2. Cd to the `web-app` directory: `cd web-app`

3. Install yarn if not existed `npm install -g yarn`

4. Install Dependencies: `yarn install` or `yarn install --registry=https://registry.npmmirror.com` in `web-app`

5. After the local backend is started, start the local frontend in the web-app directory: `yarn start`

6. Browser access to localhost:4200 to start, default account/password is *admin/hertzbeat*

### Find tasks

Find the issue you are interested in! On our GitHub repo issue list, we often publish some issues with the label good first issue or status: volunteer wanted.
These issues welcome the help of contributors. Among them, good first issues tend to have low thresholds and are suitable for novices.

Of course, if you have a good idea, you can also propose it directly on GitHub Discussion or contact with community.

### Submit Pull Request

1. First you need to fork your target [hertzbeat repository](https://github.com/apache/hertzbeat).
2. Then download the code locally with git command:

    ```shell
    git clone git@github.com:${YOUR_USERNAME}/hertzbeat.git #Recommended  
    ```

3. After the download is complete, please refer to the getting started guide or README file of the target repository to initialize the project.
4. Then, you can refer to the following command to submit the code:

    ```shell
    git checkout -b a-feature-branch #Recommended  
    ```

5. Submit the coed as a commit, the commit message format specification required: [module name or type name]feature or bugfix or doc: custom message.

    ```shell
    git add <modified file/path> 
    git commit -m '[docs]feature: necessary instructions' #Recommended 
    ```

6. Push to the remote repository

    ```shell
    git push origin a-feature-branch   
    ```

7. Then you can initiate a new PR (Pull Request) on GitHub.

    Please note that the title of the PR needs to conform to our spec, and write the necessary description in the PR to facilitate code review by Committers and other contributors.

### Wait for the code to be merged

After submitting the PR, the Committee or the community's friends will review the code you submitted (Code Review), and will propose some modification suggestions or conduct some discussions. Please pay attention to your PR in time.

If subsequent changes are required, there is no need to initiate a new PR. After submitting a commit on the original branch and pushing it to the remote repository, the PR will be automatically updated.

In addition, our project has a relatively standardized and strict CI inspection process. After submitting PR, CI will be triggered. Please pay attention to whether it passes the CI inspection.

Finally, the Committers can merge the PR into the master branch.

### After the code is merged

After the code has been merged, you can delete the development branch on both the local and remote repositories:

```shell
git branch -d a-dev-branch
git push origin --delete a-dev-branch
```

On the master/main branch, you can do the following to sync the upstream repository:

```shell
git remote add upstream https://github.com/apache/hertzbeat.git #Bind the remote warehouse, if it has been executed, it does not need to be executed again
git checkout master 
git pull upstream master
```

### HertzBeat Improvement Proposal (HIP)

If you have major new features(e.g., support metrics push gateway, support logs monitoring), you need to write a design document known as a HertzBeat Improvement Proposal (HIP). Before starting to write a HIP, make sure you follow the process [guide](https://github.com/apache/hertzbeat/tree/master/hip).

### How to become a Committer?

With the above steps, you are a contributor to HertzBeat. Repeat the previous steps to stay active in the community, keep at, you can become a Committer!

### Join Discussion

[Join the Mailing Lists](https://lists.apache.org/list.html?dev@hertzbeat.apache.org) : Mail to `dev-subscribe@hertzbeat.apache.org` to subscribe mailing lists.

Add WeChat account `ahertzbeat` to pull you into the WeChat group.

## 🥐 Architecture

- **[manager](https://github.com/apache/hertzbeat/tree/master/hertzbeat-manager)** Provide monitoring management, system management basic services.

> Provides monitoring management, monitoring configuration management, system user management, etc.
>
> - **[collector](https://github.com/apache/hertzbeat/tree/master/hertzbeat-collector)** Provide metrics data collection services.
> Use common protocols to remotely collect and obtain peer-to-peer metrics data.
> - **[warehouse](https://github.com/apache/hertzbeat/tree/master/hertzbeat-warehouse)** Provide monitoring data warehousing services.
> Metrics data management, data query, calculation and statistics.
> - **[alerter](https://github.com/apache/hertzbeat/tree/master/hertzbeat-alerter)** Provide alert service.
> Alarm calculation trigger, monitoring status linkage, alarm configuration, and alarm notification.
> - **[web-app](https://github.com/apache/hertzbeat/tree/master/web-app)** Provide web ui.
> Angular Web UI.

![hertzBeat](/img/docs/hertzbeat-arch.png)
