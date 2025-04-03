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
* 首先从远程仓库 <https://github.com/apache/hertzbeat.git> 将代码的一份副本 fork 到您自己的仓库

* 远程仓库开发合并分支：`master`

* 将您fork仓库clone到您的本地设备

  ```shell
  git clone git@github.com:<您的账户名>/hertzbeat.git
  ```

* 添加远程仓库地址，命名为 upstream

  ```shell
  git remote add upstream git@github.com:apache/hertzbeat.git
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
  git checkout origin/master
  git merge --no-ff upstream/master
  ```

* **⚠️注意一定要新建分支开发特性 `git checkout -b feature-xxx`，不建议使用master分支直接开发**
* 在本地修改代码后，提交到自己的仓库：
  **注意提交信息为英文，不包含特殊字符**

  ```shell
  git commit -m '[docs]necessary instructions'
  git push
  ```

* 将更改提交到远程仓库后，您可以在您的仓库页面上看到一个绿色的按钮“Compare & pull request”，点击它。
* 这会弹出新建 Pull Request 页面，您需要这里仔细填写信息(英文)，描述和代码同样重要，然后点击“Create pull request”按钮。
* 然后社区的 Committers 将进行 CodeReview，并与您讨论一些细节（包括设计、实现、性能等），之后您可以根据建议直接在这个分支更新代码(无需新建PR)。当社区 Committer approve之后，提交将被合并到 master 分支。
* 最后，恭喜您，您已经成为 HertzBeat 的官方贡献者，您会被加在贡献者墙上，您可以联系社区获取贡献者证书！
