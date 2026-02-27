---
id: 'new_pmc_ember_process'
title: 'new PMC Member Process'
sidebar_position: 5
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

## The process of new PMC member

- Call a vote in mailing `private@hertzbeat.apache.org`

  see **PMC Member Vote Template**

- Close the vote

  see **Close Vote Template**

- Board Approval of new PMC member

  see **Board Approval of new PMC member**

- If the result is positive, invite the new PMC member

  see **PMC member Invite Template**

- If accept, then: Accept the PMC member

  see **PMC Member Accept Template**

- Notify the PMC member of completion

  see **PMC Member Done Template**

- Announce the new PMC member

  see **PMC Member Announce Template**

## Template

Note that, there are three placeholder in template should be replaced before using

- NEW_PMC_NAME
- NEW_PMC_EMAIL
- NEW_PMC_APACHE_NAME

### PMC member Vote Template

```text
To: private@hertzbeat.apache.org
Subject: [VOTE] new PMC member candidate: `NEW_PMC_NAME`
```

```text
Hi HertzBeat PMC,

This is a formal vote about inviting `NEW_PMC_NAME` as our new PMC member.

${Work list}[1]

[1] https://github.com/apache/hertzbeat/commits?author=`NEW_PMC_NAME`
```

Note that, Voting ends one week from today, i.e. [midnight UTC on YYYY-MM-DD](https://www.timeanddate.com/counters/customcounter.html?year=YYYY&month=MM&day=DD)
[Apache Voting Guidelines](https://community.apache.org/newcommitter.html)

### Close Vote Template

```text
To: private@hertzbeat.apache.org
Subject: [RESULT] [VOTE] new PMC member: `NEW_PMC_NAME`
```

```text
Hi HertzBeat PMC,

The vote has now closed. The results are:

Binding Votes:

+1 [TOTAL BINDING +1 VOTES]
 0 [TOTAL BINDING +0/-0 VOTES]
-1 [TOTAL BINDING -1 VOTES]

The vote is ***successful/not successful***
```

### Board Approval of new PMC member Template

```text
To: board@apache.org
Cc: private@`<project>`.apache.org
Subject: [NOTICE] `NEW_PMC_NAME` for HertzBeat PMC member
```

```text
HertzBeat proposes to invite `NEW_PMC_NAME` to join the PMC.

The vote result is available here: https://lists.apache.org/...
```

[Apache New Pmc Guide](https://www.apache.org/dev/pmc.html#newpmc)

### PMC member Invite Template

```text
To: `NEW_PMC_EMAIL`
Cc: private@hertzbeat.apache.org
Subject: Invitation to become HertzBeat PMC member: `NEW_PMC_NAME`
```

```text
Hello [Candidate Name],

The HertzBeat Project Management Committee (PMC)
hereby offers you PMC members privileges to the project
These privileges are offered on the understanding that you'll use them
reasonably and with common sense. We like to work on trust
rather than unnecessary constraints.

Being a PMC member enables you
to guide the direction of the project.

Being a committer does not require you to
participate any more than you already do. It does
tend to make one even more committed.  You will
probably find that you spend more time here.

Of course, you can decline and instead remain as a
contributor, participating as you do now.

This personal invitation is a chance for you to accept or decline in private.
Please let us know in reply to this message whether you accept or decline.
Also, please refrain from sharing that you were invited before the official
announcement by the PMC.

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
    the Apache HertzBeat project and choose a
    unique Apache ID. Look to see if your preferred
    ID is already taken at
    https://people.apache.org/committer-index.html
    This will allow the Secretary to notify the PMC
    when your ICLA has been recorded.

When recording of your ICLA is noted, you will
receive a follow-up message with the next steps for
establishing you as a PMC.
```

### PMC member Accept Template

```text
To: `NEW_PMC_EMAIL`
Cc: private@hertzbeat.apache.org
Subject: Re: invitation to become HertzBeat PMC member
```

```text
Welcome. Here are the next steps in becoming a project PMC. After that
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

The incubator also has some useful information for new PMC
in incubating projects:
  https://incubator.apache.org/guides/committer.html
  https://incubator.apache.org/guides/ppmc.html

Just as before you became a PMC member, participation in any ASF community
requires adherence to the ASF Code of Conduct:
  https://www.apache.org/foundation/policies/conduct.html

Yours,
The Apache HertzBeat PMC
```

### PMC member Done Template

```text
To: private@hertzbeat.apache.org, `NEW_PMC_EMAIL`
Subject: account request: `NEW_PMC_NAME`
```

```text
`NEW_PMC_EMAIL`, as you know, the ASF Infrastructure has set up your
committer account with the username '`NEW_PMC_APACHE_NAME`'.

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

A PMC member will announce your election to the dev list soon.
```

### PMC member Announce Template

```text
To: dev@hertzbeat.apache.org
[ANNONCE] new PMC member: `NEW_PMC_NAME`
```

```text
Hi HertzBeat Community,

The Podling Project Management Committee (PMC) for Apache HertzBeat
has invited `NEW_PMC_NAME` to become our PMC member and
we are pleased to announce that he has accepted.

### add specific details here ###

Please join me in congratulating `NEW_PMC_NAME`!

Being a committer enables easier contribution to the
project since there is no need to go via the patch
submission process. This should enable better productivity.
A PMC member helps manage and guide the direction of the project.

Thanks,
On behalf of the Apache HertzBeat PMC
```
