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
  - [Roster](https://whimsy.apache.org/roster/ppmc/hertzbeat) 添加新的 committer
- Announce New Committer

  参见 **Announce New Committer Template**

## 模板

请注意，模板中有三个占位符在使用之前应该替换：

- NEW_COMMITTER_NAME 这须是真实名字，而非 Github 名称或 Id
- NEW_COMMITTER_EMAIL
- NEW_COMMITTER_APACHE_NAME

### Committer投票模板

:::note
NEW_COMMITTER_NAME 这须是真实名字，而非 Github 名称或 Id
:::

```text
To: private@hertzbeat.apache.org
Subject: [VOTE] New committer: ${NEW_COMMITTER_NAME}
```

```text
Hi HertzBeat PPMC,

This is a formal vote about inviting ${NEW_COMMITTER_NAME} as our community new committer.

Work list: https://github.com/apache/hertzbeat/commits?author=xxx

Here is the list of ${NEW_COMMITTER_NAME}'s contributions in HertzBeat Community:

> [27 commits](https://github.com/apache/hertzbeat/commits?author=xxx)
>
> 7,495 ++    627 --

Submitted PR (27 commits)
- [ISSUE #4534] [feature] add new feature in hertzbeat #3445
- xxx

Submitted Issues (18 commits)

- [bug] find some bugs in hertzbeat nodes #6565
- xxx

Please vote:

+1: I support this proposal and will welcome ${NEW_COMMITTER_NAME} as a committer.
+0: I don't care.
-1: I object to this proposal and here are my reasons.

This vote will be open for at least 7 days.

Best Wishes,
ttt
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

This personal invitation is a chance for you to accept or decline in private.
Please let us know in reply to this message whether you accept or decline.

If you accept, you will need an Apache account (id) with privileges.
Please follow these instructions.

A. If you already have an ICLA on file:

    1. If you already have an Apache account, let us know your id and we
will grant you privileges on the project repositories.

    2. If you have previously sent an ICLA, let us know the email address
and public name used on the ICLA and your preferred Apache id, and
we will request your account.

    3. If the email address on the previously submitted ICLA is no longer
valid, let us know the email address and public name used on the new ICLA,
and your preferred Apache id. Continue to step B below and file your new ICLA.

Look to see if your preferred ID is already taken at
https://people.apache.org/committer-index.html

B. If there is not already an ICLA on file, you need to submit an ICLA:

    1. Details of the ICLA and the forms are found
    through this link: https://www.apache.org/licenses/#clas

    2. Instructions for its completion and return to
    the Secretary of the ASF are found at
    https://www.apache.org/licenses/contributor-agreements.html#submitting

    Do not copy the project or any other individual on your message
    to Secretary, as the form contains Personally Identifiable Information
    that should be kept private.

    3. When you complete the ICLA form, be sure to include in the form
    the Apache [Project] project and choose a
    unique Apache ID. Look to see if your preferred
    ID is already taken at
    https://people.apache.org/committer-index.html
    This will allow the Secretary to notify the PMC
    when your ICLA has been recorded.

When recording of your ICLA is noted, you will
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

### Announce New Committer Template

```text
To: dev@hertzbeat.apache.org, ${NEW_COMMITTER_EMAIL}
Subject: [ANNOUNCE] New committer: ${NEW_COMMITTER_NAME}
```

```text
Hello Community,

The Podling Project Management Committee (PPMC) for Apache HertzBeat (incubating)
has invited ${NEW_COMMITTER_NAME} to become a committer and we are pleased to
announce that he has accepted.

${NEW_COMMITTER_NAME} is active in the Apache HertzBeat community, hope to see your
further interactions with the community!
Thanks for your contributions.

Best Wishes!
```

## 详细步骤

### 接受邀请

当通过PMC内部投票后，PMC会向您索要个人邮箱，之后您会收到一封邮件，邮件会指引您进行下一步操作，内容为:

```text
Hello xxxx,

The HertzBeat Project Management Committee (PPMC)
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

如果您接受邀请，请回复该邮件，记住要**回复全部**，回复内容为:

```text
hi, i accept. Thanks for invitaion.
```

随后您会收到一封邮件，里面描述这如何具体步骤，也可以根据我们的文档继续进行操作。

### ICLA签署流程

接受邀请后，会收到邮件，邮件会指引签署iCLA。

1. 下载iCLA申请表

    打开访问:[https://www.apache.org/licenses/#clas](https://www.apache.org/licenses/#clas)

    找到`CLAs`点击进入页面

    ![HertzBeat](/img/docs/community/clas-web.png)

    找到`ICLA(个人贡献者许可协议)`，点击[Individual Contributor License Agreement](https://www.apache.org/licenses/icla.pdf)

    ![HertzBeat](/img/docs/community/icla-web.png)

    跳转后，会显示需要签署的协议，这里可以在网页上直接填写，也可以下载后填写。

    ![HertzBeat](/img/docs/community/icla-pdf.png)

2. 填写iCLA

    > tips: 签名时需要手写签名，其他的可以直接填写后打印。

    需要填写的内容：

    ![HertzBeat](/img/docs/community/icla-content-1.png)
    ![HertzBeat](/img/docs/community/icla-content-2.png)

    在PDF中需要填写的字段：

   - `Full name`
   - `Public name`
   - `Postal Address`
   - `Country`
   - `E-Mail`
   - `(optional) preferred Apache id(s)`
   - `(optional) notify project`
   - `Date`

    > 填写样例
    > ![HertzBeat](/img/docs/community/icla-content-3.png)
    > ![HertzBeat](/img/docs/community/icla-content-4.png)

3. 打印并签署

    ![HertzBeat](/img/docs/community/icla-content-5.png)

    `Please sign`字段需要将文件打印出来然后手写签名，内容为自己姓名的全拼。

4. 将签名后的文件拍照或扫描转为PDF，并重命名为`姓名拼音-icla.pdf`

5. 发送邮件到指定邮箱

  邮件发送到`secretary@apache.org`，抄送到`private@hertzbeat.apache.org`。

  注意⚠️此邮件内容需要附加上之前的 committer 邀请邮件信息, 建议在之前的往来邮件点击回复然后修改标题和收件人等。

  **发送模板**

  主题：`Accept to become a Hertzbeat(incubating) committer`

  正文:

  ```text
  Hello Apache,
      I am willing contribute to the ASF. The attachment is my ICLA information. My Github account is : https://github.com/xxxx.
  Thanks !
  ```

  大概1-5个工作日你就会收到一封来自`root@apache.org`的邮件。

  当您收到邮件标题为：`Welcome to the Apache Software Foundation`的邮件，恭喜你，你已经获取到Apache ID了！

### 设置Apache密码

在网站 [https://id.apache.org/reset/enter](https://id.apache.org/reset/enter) 输入您的Apache ID

![HertzBeat](/img/docs/community/account-1.png)

点击`Send Email`后会提示发送成功。

在您提供给PMC的邮箱中会收到一封来自`root@apache.org`重置密码的邮件，标题为`Password reset request for xxx from Apache ID`，在邮件正文中会有重置密码的链接，我们点击链接设置密码。

### 将Apache账号和GitHub账号关联

访问: <https://whimsy.apache.org/roster/committer/${APACHE_ID}>

- `${APACHE_ID}`替换成你的Apache ID

登录后可以看到这个内容`Link GitHub username to ASF id`，点击跳转

![HertzBeat](/img/docs/community/account-2.png)

输入您的Apache的账号和密码并登录

![HertzBeat](/img/docs/community/account-3.png)

点击 `Authenticate with GitHub`

![HertzBeat](/img/docs/community/account-4.png)

点击`Authorize apache`授权给Apache

![HertzBeat](/img/docs/community/account-5.png)

点击`Send GitHub Invitation!` 发送GitHub邀请邮件

![HertzBeat](/img/docs/community/account-6.png)

邮箱中会收到一封邮件，点击`Join @apache`

> 这里邮箱指的是您提供给PMC的那个邮箱地址

![HertzBeat](/img/docs/community/account-7.png)

点击`Join The Apache Software Foundation`，加入GitHub加入Apache组织，会自动跳转到GitHub页面

![HertzBeat](/img/docs/community/account-8.png)
![HertzBeat](/img/docs/community/account-9.png)

回到Apache页面，提示GitHub启用多重身份认证，在GitHub页面启用双重身份认证

> GitHub双重身份认证介绍，[点击跳转官方文档](https://docs.github.com/zh/authentication/securing-your-account-with-two-factor-authentication-2fa/about-two-factor-authentication)

![HertzBeat](/img/docs/community/account-10.png)

启动完成之后等几分钟，提示已经绑定完成

![HertzBeat](/img/docs/community/account-11.png)

至此您的GitHub账号与Apache账号就绑定完成了。

最后一步，联系PMC主席开启svn和其他访问权限。

## 邮箱绑定

### GMail邮箱绑定

邮箱地址:[https://mail.google.com/](https://mail.google.com/)

进入设置页面，并点击`添加其他电子邮件地址``

![HertzBeat](/img/docs/community/email-1.png)

填写您的apache邮箱，按照指引点击下一步

![HertzBeat](/img/docs/community/email-2.png)
![HertzBeat](/img/docs/community/email-3.png)
![HertzBeat](/img/docs/community/email-4.png)

设置为默认发送邮箱(可选)

![HertzBeat](/img/docs/community/email-5.png)

配置完成。

最后一步，别忘了订阅[开发者邮箱列表](./mailing_lists.md)。
