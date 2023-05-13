---
id: contributing  
title: Contributing Guide    
sidebar_label: Contributing Guide    
---

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
> This is a front-end and back-end separation project. To start the local code, the back-end [manager](https://github.com/dromara/hertzbeat/tree/master/manager) and the front-end [web-app](https://github.com/dromara/hertzbeat/tree/master/web-app) must be started separately.


- Backend start

1. Requires `maven3+`, `java11` and `lombok` environments
2. (Optional) Modify the configuration file-`manager/src/main/resources/application.yml`
3. Start `springboot manager` service `manager/src/main/java/org/dromara/hertzbeat/manager/Manager.java`

- Front-web start

1. Need `nodejs npm angular-cli` environment
2. Install yarn: `npm install -g yarn`
3. Execute under the front-end project directory web-app: `yarn install`
4. Install angular-cli globally: `npm install -g @angular/cli@14 --registry=https://registry.npm.taobao.org`
5. After the local backend is started, start the local frontend in the web-app directory: `ng serve --open`
6. Browser access to localhost:4200 to start, default account/password is *admin/hertzbeat*

### Find tasks

Find the issue you are interested in! On our GitHub repo issue list, we often publish some issues with the label good first issue or status: volunteer wanted.
These issues welcome the help of contributors. Among them, good first issues tend to have low thresholds and are suitable for novices.

Of course, if you have a good idea, you can also propose it directly on GitHub Discussion or contact with community.

### Submit Pull Request

1. First you need to fork your target [hertzbeat repository](https://github.com/dromara/hertzbeat).
2. Then download the code locally with git command:
```shell
git clone git@github.com:${YOUR_USERNAME}/hertzbeat.git #Recommended  
```
3. After the download is complete, please refer to the getting started guide or README file of the target repository to initialize the project.
4. Then, you can refer to the following command to submit the code:
```shell
git checkout -b a-feature-branch #Recommended  
```
5. Submit the coed as a commit, the commit message format specification required: [module name or type name] feature or bugfix or doc: custom message.
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
git remote add upstream https://github.com/dromara/hertzbeat.git #Bind the remote warehouse, if it has been executed, it does not need to be executed again
git checkout master 
git pull upstream master
```

### How to become a Committer?

With the above steps, you are a contributor to HertzBeat. Repeat the previous steps to stay active in the community, keep at, you can become a Committer!

### Join Discussion

[Gitter Channel](https://gitter.im/hertzbeat/community)

[Github Discussion](https://github.com/dromara/hertzbeat/discussions)

[User Club](https://support.qq.com/products/379369)

Add WeChat account `tan-cloud` to pull you into the WeChat group.

QQ group number `236915833`, verify code: `tancloud`

Public WeChat: `tancloudtech`

## 🥐 Architecture

- **[manager](https://github.com/dromara/hertzbeat/tree/master/manager)** Provide monitoring management, system management basic services.
> Provides monitoring management, monitoring configuration management, system user management, etc.
- **[collector](https://github.com/dromara/hertzbeat/tree/master/collector)** Provide metrics data collection services.
> Use common protocols to remotely collect and obtain peer-to-peer metrics data.
- **[warehouse](https://github.com/dromara/hertzbeat/tree/master/warehouse)** Provide monitoring data warehousing services.
> Metrics data management, data query, calculation and statistics.
- **[alerter](https://github.com/dromara/hertzbeat/tree/master/alerter)** Provide alert service.
> Alarm calculation trigger, monitoring status linkage, alarm configuration, and alarm notification.
- **[web-app](https://github.com/dromara/hertzbeat/tree/master/web-app)** Provide web ui.
> Angular Web UI.

![hertzBeat](https://cdn.jsdelivr.net/gh/dromara/hertzbeat/home/static/img/docs/hertzbeat-stru-en.svg)   
