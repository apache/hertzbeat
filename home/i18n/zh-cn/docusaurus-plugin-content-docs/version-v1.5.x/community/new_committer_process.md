---
id: 'new_committer_process'
title: '提名新Committer流程'
sidebar_position: 4
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

[官方指南](https://community.apache.org/newcommitter.html#new-committer-process)

## 提名新Committer的流程

- 在邮件`private@hertzbeat.apache.org`中发起投票

  参见 **Committer投票模板**

- 关闭投票

  参见 **关闭投票模板**

- 如果结果是赞成，邀请新的Committer

  参见 **Committer邀请模板**

- 如果同意，那么：接受Committer

  参见 **Committer接受模板**

- 新Committer签署CLA，等待CLA的接收记录

- 请求创建Committer账户

  参见 **Committer账户创建模板**

  - 等待root告诉我们已经完成
  - PMC主席开启svn和其他访问权限
  - 在JIRA和CWiki中将Committer添加到适当的组中
- 通知Committer完成

  参见 **Committer完成模板**

## 模板

请注意，模板中有三个占位符在使用之前应该替换：

- NEW_COMMITTER_NAME
- NEW_COMMITTER_EMAIL
- NEW_COMMITTER_APACHE_NAME

### Committer投票模板

```text
To: private@hertzbeat.apache.org
Subject: [VOTE] New committer: ${NEW_COMMITTER_NAME}
```

```text
Hi HertzBeat PPMC,

This is a formal vote about inviting ${NEW_COMMITTER_NAME} as our new committer.

${Work list}[1]

[1] https://github.com/apache/hertzbeat/commits?author=${NEW_COMMITTER_NAME}
```

注意，投票将在今天一周后结束，即
[midnight UTC on YYYY-MM-DD](https://www.timeanddate.com/counters/customcounter.html?year=YYYY&month=MM&day=DD)
[Apache投票指南](https://community.apache.org/newcommitter.html)

### 关闭投票模板

```text
To: private@hertzbeat.apache.org
Subject: [RESULT] [VOTE] New committer: ${NEW_COMMITTER_NAME}
```

```text
Hi HertzBeat PPMC,

The vote has now closed. The results are:

Binding Votes:

+1 [TOTAL BINDING +1 VOTES]
 0 [TOTAL BINDING +0/-0 VOTES]
-1 [TOTAL BINDING -1 VOTES]

The vote is ***successful/not successful***
```

### Committer邀请模板

```text
To: ${NEW_COMMITTER_EMAIL}
Cc: private@hertzbeat.apache.org
Subject: Invitation to become HertzBeat committer: ${NEW_COMMITTER_NAME}
```

```text
Hello ${NEW_COMMITTER_NAME},

The HertzBeat Project Management Committee (PMC) 
hereby offers you committer privileges to the project.
These privileges are offered on the understanding that
you'll use them reasonably and with common sense.
We like to work on trust rather than unnecessary constraints. 

Being a committer enables you to more easily make 
changes without needing to go through the patch 
submission process.

Being a committer does not require you to 
participate any more than you already do. It does 
tend to make one even more committed.  You will 
probably find that you spend more time here.

Of course, you can decline and instead remain as a 
contributor, participating as you do now.

A. This personal invitation is a chance for you to 
accept or decline in private.  Either way, please 
let us know in reply to the private@hertzbeat.apache.org
address only.

B. If you accept, the next step is to register an iCLA:
    1. Details of the iCLA and the forms are found 
    through this link: https://www.apache.org/licenses/#clas

    2. Instructions for its completion and return to 
    the Secretary of the ASF are found at
    https://www.apache.org/licenses/#submitting

    3. When you transmit the completed iCLA, request 
    to notify the Apache HertzBeat and choose a 
    unique Apache ID. Look to see if your preferred 
    ID is already taken at 
    https://people.apache.org/committer-index.html
    This will allow the Secretary to notify the PMC 
    when your iCLA has been recorded.

When recording of your iCLA is noted, you will 
receive a follow-up message with the next steps for 
establishing you as a committer.
```

### Committer接受模板

```text
To: ${NEW_COMMITTER_EMAIL}
Cc: private@hertzbeat.apache.org
Subject: Re: invitation to become HertzBeat committer
```

```text
Welcome. Here are the next steps in becoming a project committer. After that
we will make an announcement to the dev@hertzbeat.apache.org list.

You need to send a Contributor License Agreement to the ASF.
Normally you would send an Individual CLA. If you also make
contributions done in work time or using work resources,
see the Corporate CLA. Ask us if you have any issues.
https://www.apache.org/licenses/#clas.

You need to choose a preferred ASF user name and alternatives.
In order to ensure it is available you can view a list of taken IDs at
https://people.apache.org/committer-index.html

Please notify us when you have submitted the CLA and by what means 
you did so. This will enable us to monitor its progress.

We will arrange for your Apache user account when the CLA has 
been recorded.

After that is done, please make followup replies to the dev@hertzbeat.apache.org list.
We generally discuss everything there and keep the
private@hertzbeat.apache.org list for occasional matters which must be private.

The developer section of the website describes roles within the ASF and provides other
resources:
  https://www.apache.org/foundation/how-it-works.html
  https://www.apache.org/dev/

The incubator also has some useful information for new committers
in incubating projects:
  https://incubator.apache.org/guides/committer.html
  https://incubator.apache.org/guides/ppmc.html

Just as before you became a committer, participation in any ASF community
requires adherence to the ASF Code of Conduct:
  https://www.apache.org/foundation/policies/conduct.html

Yours,
The Apache HertzBeat PPMC
```

### Committer完成模板

```text
To: private@hertzbeat.apache.org, ${NEW_COMMITTER_EMAIL}
Subject: account request: ${NEW_COMMITTER_NAME}
```

```text
${NEW_COMMITTER_NAME}, as you know, the ASF Infrastructure has set up your
committer account with the username '${NEW_COMMITTER_APACHE_NAME}'.

Please follow the instructions to set up your SSH,
svn password, svn configuration, email forwarding, etc.
https://www.apache.org/dev/#committers

You have commit access to specific sections of the
ASF repository, as follows:

The general "committers" at:
  https://svn.apache.org/repos/private/committers

If you have any questions during this phase, then please
see the following resources:

Apache developer's pages: https://www.apache.org/dev/
Incubator committer guide: https://incubator.apache.org/guides/committer.html

Naturally, if you don't understand anything be sure to ask us on the dev@hertzbeat.apache.org mailing list. 
Documentation is maintained by volunteers and hence can be out-of-date and incomplete - of course
you can now help fix that.

A PPMC member will announce your election to the dev list soon.
```
