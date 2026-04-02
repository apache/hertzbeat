---
id: contribution  
title: 贡献指南
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

> 非常欢迎参与项目贡献，我们致力于维护一个互相帮助的快乐社区。

## 贡献方式
>
> 在 Apache HertzBeat™ 社区，贡献方式有很多:

- 💻**代码**：可以帮助社区完成一些任务、编写新的 feature 或者是修复一些 bug；

- ⚠️**测试**：可以来参与测试代码的编写，包括了单元测试、集成测试、e2e 测试；

- 📖**文档**：可以编写或完善文档，来帮助用户更好地了解和使用 HertzBeat；

- 📝**博客**：可以撰写 HertzBeat 的相关文章，来帮助社区更好地推广；

- 🤔**讨论**：可以参与 HertzBeat 新的 feature 的讨论，将您的想法跟 HertzBeat 融合；

- 💡**布道**：可以帮助宣传或推广 HertzBeat 社区，在 meetup 或 summit 中演讲；

- 💬**建议**：也可以对项目或者社区提出一些建议，促进社区的良性发展；

更多贡献方式参见 [Contribution Types](https://allcontributors.org/emoji-key)

即便是小到错别字的修正我们也都非常欢迎 :)

### 让 HertzBeat 运行起来

> 让 HertzBeat 的代码在您的开发工具上运行起来，并且能够断点调试。
> 此为前后端分离项目，本地代码启动需将后端 [manager](https://github.com/apache/hertzbeat/tree/master/hertzbeat-manager) 和前端 [web-app](https://github.com/apache/hertzbeat/tree/master/web-app) 分别启动生效。

#### 后端启动

1. 需要 `maven3+`, `java25` 和 `lombok` 环境

2. (可选)修改配置文件配置信息-`hertzbeat-startup/src/main/resources/application.yml`

3. 在项目根目录运行编译: `mvn clean install -DskipTests`

4. 在 `jvm` 加入参数 `--add-opens=java.base/java.nio=org.apache.arrow.memory.core,ALL-UNNAMED`

5. 启动`springboot startup`服务 `hertzbeat-startup/src/main/java/org/apache/hertzbeat/startup/HertzBeatApplication.java`

#### 前端启动

1. 需要 `nodejs pnpm` 环境, 确保 `Node.js >= 18`

2. 进入 `web-app` 目录: `cd web-app`

3. 安装 pnpm: `npm install -g pnpm`

4. 在前端工程目录 `web-app` 下执行: `pnpm install` or `pnpm install --registry=https://registry.npmmirror.com` in `web-app`

5. 待本地后端启动后，在 web-app 目录下启动本地前端 `pnpm start`

6. 浏览器访问 localhost:4200 即可开始，默认账号密码 **admin/hertzbeat**

### 寻找任务

寻找您感兴趣的 Issue！在我们的 GitHub 仓库和邮件列表中，我们经常会发布一些带有 good first issue 或者 status: volunteer wanted 标签的 issue，这些issue都欢迎贡献者的帮助。
其中 good first issue 往往门槛较低、适合新手。

当然，如果您有好的想法，也可以直接在 GitHub Discussion 中提出或者联系社区。

### 提交 Pull Request

1. 首先您需要 Fork 目标仓库 [hertzbeat repository](https://github.com/apache/hertzbeat).
2. 然后 用 git 命令 将代码下载到本地:

    ```shell
    git clone git@github.com:`YOUR_USERNAME`/hertzbeat.git #Recommended  
    ```

3. 下载完成后，请参考目标仓库的入门指南或者 README 文件对项目进行初始化。
4. 接着，您可以参考如下命令进行代码的提交, 切换新的分支, 进行开发:

    ```shell
    git checkout -b a-feature-branch #Recommended  
    ```

5. 提交 commit, commit 描述信息需要符合约定格式: [module name or type name]feature or bugfix or doc: custom message.

    ```shell
    git add <modified file/path> 
    git commit -m '[docs]feature: necessary instructions' #Recommended 
    ```

6. 推送到远程仓库

    ```shell
    git push origin a-feature-branch   
    ```

7. 然后您就可以在 GitHub 上发起新的 PR (Pull Request)。

    请注意 PR 的标题需要符合我们的规范，并且在 PR 中写上必要的说明，来方便 Committer 和其他贡献者进行代码审查。

### 等待PR代码被合并

在提交了 PR 后，Committer 或者社区的小伙伴们会对您提交的代码进行审查（Code Review），会提出一些修改建议，或者是进行一些讨论，请及时关注您的PR。

若后续需要改动，不需要发起一个新的 PR，在原有的分支上提交 commit 并推送到远程仓库后，PR会自动更新。

另外，我们的项目有比较规范和严格的 CI 检查流程，在提交 PR 之后会触发 CI，请注意是否通过 CI 检查。

最后，Committer 可以将 PR 合并入 master 主分支。

### 代码被合并后

在代码被合并后，您就可以在本地和远程仓库删除这个开发分支了：

```shell
git branch -d a-dev-branch
git push origin --delete a-dev-branch
```

在主分支上，您可以执行以下操作来同步上游仓库：

```shell
git remote add upstream https://github.com/apache/hertzbeat.git #Bind the remote warehouse, if it has been executed, it does not need to be executed again
git checkout master 
git pull upstream master
```

### 领取贡献者证书

在您的 PR 被合并后，您可以发送如下内容邮件到 `dev@hertzbeat.apache.org` 来申请领取属于您的 Apache HertzBeat™ 贡献者电子证书。

```text
Title: [Contributor] Request for a Contributor Certificate: <Your Full Name>
Body:
Hello,
I would like to request a Contributor Certificate for my contributions to the Apache HertzBeat™ project.

- Full Name: <Your Full Name> # The Full Name will be printed on the certificate, any name you want.
- GitHub Username: <Your GitHub Username>
- Pull Request Links: <List the URLs of the pull requests you have submitted>
- Email Address: <Your Email Address>

Best regards,
<Your Name>
```

在几个工作日内，您会收到携带电子证书的回复，您的名字也会出现在贡献者列表中。
注意贡献者的证书是电子的，待您成为 `Committer` 或者 `PMC` 的证书是实体的。

证书样例：

![cert](/img/docs/hertzbeat-cert.png)

### 如何成为 Committer？

通过上述步骤，您就是 HertzBeat 的贡献者了。重复前面的步骤，在社区中保持活跃，坚持下去，您就能成为 Committer！

### 加入讨论交流

[讨论交流](contact)
