---
id: 'new_committer_process'
title: 'New Committer Process'
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

[Apache New Committer Guideline](https://community.apache.org/newcommitter.html#new-committer-process)

## The process of new Committer

- Call a vote in mailing `private@hertzbeat.apache.org`

  see **Committer Vote Template**

- Close the vote

  see **Close Vote Template**

- If the result is positive, invite the new committer

  see **Committer Invite Template**

- If accepted, then: Accept the committer

  see **Committer Accept Template**

- New Committer sign CLA and wait for CLA is recorded

- Request creation of the committer account

  see **Committer Account Creation**

  - Wait until root says it is done
  - [Roster](https://whimsy.apache.org/roster/ppmc/hertzbeat) add the new committer
- Announce the new committer

  see **Announce New Committer Template**

## Template

Note that, there are three placeholder in template should be replaced before using

- NEW_COMMITTER_NAME This Must Be Public Name, Not Github Name Or Id.
- NEW_COMMITTER_EMAIL
- NEW_COMMITTER_APACHE_NAME

### Committer Vote Template

:::note
NEW_COMMITTER_NAME This Must Be Public Name, Not Github Name Or Id.
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

See voting guidelines at
https://community.apache.org/newcommitter.html

Best Wishes,
ttt
```

Note that, Voting ends one week from today, i.e.
[midnight UTC on YYYY-MM-DD](https://www.timeanddate.com/counters/customcounter.html?year=YYYY&month=MM&day=DD)
[Apache Voting Guidelines](https://community.apache.org/newcommitter.html)

### Close Vote Template

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

### Committer Invite Template

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

### Committer Accept Template

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
