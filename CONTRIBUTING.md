## Contributor Guide [中文贡献者指南](#贡献者指南)    

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
> This is a front-end and back-end separation project. To start the local code, the back-end [manager](manager) and the front-end [web-app](web-app) must be started separately.  


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

5. Install angular-cli globally: `yarn global add @angular/cli@15` or `yarn global add @angular/cli@15 --registry=https://registry.npmmirror.com`

6. After the local backend is started, start the local frontend in the web-app directory: `ng serve --open`

7. Browser access to localhost:4200 to start, default account/password is *admin/hertzbeat*


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
If you have major new features(e.g., support metrics push gateway, support logs monitoring), you need to write a design document known as a HertzBeat Improvement Proposal (HIP). Before starting to write a HIP, make sure you follow the process [here](https://github.com/apache/hertzbeat/tree/master/hip).

### How to become a Committer?  

With the above steps, you are a contributor to HertzBeat. Repeat the previous steps to stay active in the community, keep at, you can become a Committer!    

### Join Discussion   

[Join the Mailing Lists](https://lists.apache.org/list.html?dev@hertzbeat.apache.org) : Mail to `dev-subscribe@hertzbeat.apache.org` to subscribe mailing lists.

Add WeChat account `ahertzbeat` to pull you into the WeChat group.

## 🥐 Architecture

- **[manager](https://github.com/apache/hertzbeat/tree/master/hertzbeat-manager)** Provide monitoring management, system management basic services.
> Provides monitoring management, monitoring configuration management, system user management, etc.
- **[collector](https://github.com/apache/hertzbeat/tree/master/collector)** Provide metrics data collection services.
> Use common protocols to remotely collect and obtain peer-to-peer metrics data.
- **[warehouse](https://github.com/apache/hertzbeat/tree/master/warehouse)** Provide monitoring data warehousing services.
> Metrics data management, data query, calculation and statistics.
- **[alerter](https://github.com/apache/hertzbeat/tree/master/hertzbeat-alerter)** Provide alert service.
> Alarm calculation trigger, monitoring status linkage, alarm configuration, and alarm notification.
- **[web-app](https://github.com/apache/hertzbeat/tree/master/web-app)** Provide web ui.
> Angular Web UI.

![hertzBeat](home/static/img/docs/hertzbeat-arch.png)

<br>  

------

<br>

## 贡献者指南    

> 非常欢迎参与项目贡献，我们致力于维护一个互相帮助的快乐社区。  

### 贡献方式   

> 在 HertzBeat 社区，贡献方式有很多:  

- 💻**代码**：可以帮助社区完成一些任务、编写新的feature或者是修复一些bug；

- ⚠️**测试**：可以来参与测试代码的编写，包括了单元测试、集成测试、e2e测试；

- 📖**文档**：可以编写或完善文档，来帮助用户更好地了解和使用 HertzBeat；

- 📝**博客**：可以撰写 HertzBeat 的相关文章，来帮助社区更好地推广；

- 🤔**讨论**：可以参与 HertzBeat 新的feature的讨论，将您的想法跟 HertzBeat 融合；

- 💡**布道**：可以帮助宣传或推广 HertzBeat 社区，在 meetup 或 summit 中演讲；

- 💬**建议**：也可以对项目或者社区提出一些建议，促进社区的良性发展；  

更多贡献方式参见 [Contribution Types](https://allcontributors.org/docs/en/emoji-key)

即便是小到错别字的修正我们也都非常欢迎 :)   

### 让 HertzBeat 运行起来   

> 让 HertzBeat 的代码在您的开发工具上运行起来，并且能够断点调试。   
> 此为前后端分离项目，本地代码启动需将后端[manager](manager)和前端[web-app](web-app)分别启动生效。

#### 后端启动

1. 需要 `maven3+`, `java17` 和 `lombok` 环境

2. (可选)修改配置文件配置信息-`manager/src/main/resources/application.yml`

3. 在项目根目录运行编译: `mvn clean install -DskipTests`

4. 在 `jvm` 加入参数 `--add-opens=java.base/java.nio=org.apache.arrow.memory.core,ALL-UNNAMED`

5. 启动`springboot manager`服务 `manager/src/main/java/org/apache/hertzbeat/hertzbeat-manager/Manager.java`


#### 前端启动

1. 需要 `nodejs yarn` 环境, Make sure `Node.js >= 18`

2. 进入 `web-app` 目录: `cd web-app`

3. 安装yarn: `npm install -g yarn`

4. 在前端工程目录 `web-app` 下执行: `yarn install` or `yarn install --registry=https://registry.npmmirror.com` in `web-app`

5. 全局安装 `angular-cli`: `yarn global add @angular/cli@15` or `yarn global add @angular/cli@15 --registry=https://registry.npmmirror.com`

6. 待本地后端启动后，在web-app目录下启动本地前端 `ng serve --open`

7. 浏览器访问 localhost:4200 即可开始，默认账号密码 *admin/hertzbeat*

### 寻找任务  

寻找您感兴趣的Issue！在我们的GitHub仓库和邮件列表中，我们经常会发布一些带有 good first issue 或者 status: volunteer wanted 标签的issue，这些issue都欢迎贡献者的帮助。
其中good first issue往往门槛较低、适合新手。   

当然，如果您有好的想法，也可以直接在GitHub Discussion 中提出或者联系社区。  

### 提交 Pull Request

1. 首先您需要 Fork 目标仓库 [hertzbeat repository](https://github.com/apache/hertzbeat).
2. 然后 用git命令 将代码下载到本地:  
    ```shell
    git clone git@github.com:${YOUR_USERNAME}/hertzbeat.git #Recommended  
    ```
3. 下载完成后，请参考目标仓库的入门指南或者 README 文件对项目进行初始化。
4. 接着，您可以参考如下命令进行代码的提交, 切换新的分支, 进行开发:  
    ```shell
    git checkout -b a-feature-branch #Recommended  
    ```
5. 提交 commit , commit 描述信息需要符合约定格式: [module name or type name]feature or bugfix or doc: custom message. 
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

### HertzBeat 改进提案 (HIP)
如果您有重大的新特性（例如，支持指标推送网关，日志监控等），您需要编写一个被称为 HertzBeat 改进提案（HertzBeat Improvement Proposal，HIP）的设计文档。在开始编写 HIP 之前，请确保您遵循了[这里](https://github.com/apache/hertzbeat/tree/master/hip)的流程。

### 如何成为Committer？  

通过上述步骤，您就是 HertzBeat 的贡献者了。重复前面的步骤，在社区中保持活跃，坚持下去，您就能成为 Committer！  

### 加入讨论交流

[Join the Mailing Lists](https://lists.apache.org/list.html?dev@hertzbeat.apache.org) : Mail to `dev-subscribe@hertzbeat.apache.org` to subscribe mailing lists.

Add WeChat account `ahertzbeat` to pull you into the WeChat group.

### 模块

- **[manager](https://github.com/apache/hertzbeat/tree/master/hertzbeat-manager)** 提供监控管理,系统管理基础服务
> 提供对监控的管理，监控应用配置的管理，系统用户租户后台管理等。
- **[collector](https://github.com/apache/hertzbeat/tree/master/collector)** 提供监控数据采集服务
> 使用通用协议远程采集获取对端指标数据。
- **[warehouse](https://github.com/apache/hertzbeat/tree/master/warehouse)** 提供监控数据仓储服务
> 采集指标结果数据管理，数据落盘，查询，计算统计。
- **[alerter](https://github.com/apache/hertzbeat/tree/master/hertzbeat-alerter)** 提供告警服务
> 告警计算触发，任务状态联动，告警配置，告警通知。
- **[web-app](https://github.com/apache/hertzbeat/tree/master/web-app)** 提供可视化控制台页面
> 监控告警系统可视化控制台前端

![hertzBeat](home/static/img/docs/hertzbeat-arch.png)     
