---
id: 'submit_code'
title: 'Submit Code'
sidebar_position: 2
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
* First from the remote repository <https://github.com/apache/hertzbeat.git> fork a copy of the code into your own repository

* The remote dev and merge branch is `master`.

* Clone your repository to your local

```shell
git clone git@github.com:<Your Github ID>/hertzbeat.git
```

* Add remote repository address, named upstream

```shell
git remote add upstream git@github.com:apache/hertzbeat.git
```

* View repository

```shell
git remote -v
```

> At this time, there will be two repositories: origin (your own repository) and upstream (remote repository)

* Get/Update remote repository code

  ```shell
  git fetch upstream
  ```

* Synchronize remote repository code to local repository

  ```shell
  git checkout origin/dev
  git merge --no-ff upstream/dev
  ```

* **⚠️Note that you must create a new branch to develop features `git checkout -b feature-xxx`. It is not recommended to use the master branch for direct development**
* After modifying the code locally, submit it to your own repository:
  **Note that the submission information does not contain special characters**

  ```shell
  git commit -m 'commit content'
  git push
  ```

* Submit changes to the remote repository, you can see a green button "Compare & pull request" on your repository page, click it.
* Select the modified local branch and the branch you want to merge with the past, you need input the message carefully, describe doc is important as code, click "Create pull request".
* Then the community Committers will do CodeReview, and then he will discuss some details (design, implementation, performance, etc.) with you, afterward you can directly update the code in this branch according to the suggestions (no need to create a new PR). When this pr is approved, the commit will be merged into the master branch
* Finally, congratulations, you have become an official contributor to HertzBeat ! You will be added to the contributor wall, you can contact the community to obtain a contributor certificate.
