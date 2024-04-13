---
id: 'submit_code'
title: '提交代码'
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

* 首先从远程仓库 <https://github.com/apache/incubator-hertzbeat.git> 将代码的一份副本 fork 到您自己的仓库

* 远程仓库目前有三个分支：
  * **dev** 每日开发分支
    > 每天的 dev 开发分支，新提交的代码可以向这个分支发起 pull request。

  * **1.0.0-release** 发布版本分支
    > 发布版本的分支，未来还会有 2.0... 等其他版本分支。

* 将您的仓库clone到您的本地设备

    ```shell
    git clone git@github.com:apache/incubator-hertzbeat.git
    ```

* 添加远程仓库地址，命名为 upstream

    ```shell
    git remote add upstream git@github.com:apache/incubator-hertzbeat.git
    ```

* 查看仓库

    ```shell
    git remote -v
    ```

  > 此时会有两个仓库：origin（您自己的仓库）和 upstream（远程仓库）

* 获取/更新远程仓库代码

    ```shell
    git fetch upstream
    ```

* 将远程仓库代码同步到本地仓库

    ```shell
    git checkout origin/dev
    git merge --no-ff upstream/dev
    ```

* 如果远程分支有新的分支，如 `dev-1.0`，您需要将这个分支同步到本地仓库

    ```shell
    git checkout -b dev-1.0 upstream/dev-1.0
    git push --set-upstream origin dev-1.0
    ```

* 在本地修改代码后，提交到自己的仓库：

    ```shell
    git commit -m '提交内容'
    git push
    ```

* 将更改提交到远程仓库

* 在github页面，点击“New pull request”。

* 选择修改过的本地分支和过去要合并的分支，点击“Create pull request”。

* 然后社区的 Committers 将进行 CodeReview，并与您讨论一些细节（包括设计、实现、性能等）。当团队的每个成员都对此修改感到满意时，提交将被合并到 dev 分支。

* 最后，恭喜您，您已经成为 HertzBeat 的官方贡献者！
