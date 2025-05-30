---
id: 'how_to_release'
title: How to Release
sidebar_position: 4
---

This tutorial describes in detail how to release Apache HertzBeat, take the release of version 1.6.0 as an example.

## 1. Environmental requirements

This release process is operated in the UbuntuOS(Windows,Mac), and the following tools are required:

- JDK 17
- Node18 Yarn
- Apache Maven 3.x
- GnuPG 2.x
- Git
- SVN (apache uses svn to host project releases)

> Pay attention to setting environment variables `export GPG_TTY=$(tty)`

## 2. Preparing for release

> First summarize the account information to better understand the operation process, will be used many times later.
>
> - apache id: `muchunjin (APACHE LDAP UserName)`
> - apache passphrase: `APACHE LDAP Passphrase`
> - apache email: `muchunjin@apache.org`
> - gpg real name: `muchunjin (Any name can be used, here I set it to the same name as the apache id)`
> - gpg key passphrase: `The password set when creating the gpg key, you need to remember this password`

### 2.1 Key generation

```shell
$ gpg --full-gen-key
gpg (GnuPG) 2.2.27; Copyright (C) 2021 Free Software Foundation, Inc.
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.

Please select what kind of key you want:
(1) RSA and RSA (default)
(2) DSA and Elgamal
(3) DSA (sign only)
(4) RSA (sign only)
(14) Existing key from card
Your selection? 1 # Please enter 1
RSA keys may be between 1024 and 4096 bits long.
What keysize do you want? (3072) 4096 # Please enter 4096 here
Requested keysize is 4096 bits
Please specify how long the key should be valid.
0 = key does not expire
<n> = key expires in n days
<n>w = key expires in n weeks
<n>m = key expires in n months
<n>y = key expires in n years
Key is valid for? (0) 0 # Please enter 0
Key does not expire at all
Is this correct? (y/N) y # Please enter y here

GnuPG needs to construct a user ID to identify your key.

Real name: muchunjin # Please enter 'gpg real name'
Email address: muchunjin@apache.org # Please enter your apache email address here
Comment: apache key # Please enter some comments here
You selected this USER-ID:
    "muchunjin (apache key) <muchunjin@apache.org>"

Change (N)ame, (C)omment, (E)mail or (O)kay/(Q)uit? O # Please enter O here
We need to generate a lot of random bytes. It is a good idea to perform
some other action (type on the keyboard, move the mouse, utilize the
disks) during the prime generation; this gives the random number
generator a better chance to gain enough entropy.

# At this time, a dialog box will pop up, asking you to enter the key for this gpg. 
# you need to remember that it will be used in subsequent steps.
┌─────────────────────────────────────────────────────┐
│ Please enter this passphrase to                     │
│ protect your new key                                │
│                                                     │
│ Passphrase: _______________________________________ │
│                                                     │
│     <OK>                    <Cancel>                │
└─────────────────────────────────────────────────────┘

# Here you need to re-enter the password in the previous step.
┌─────────────────────────────────────────────────────┐
│ Please re-enter this passphrase                     │
│                                                     │
│ Passphrase: _______________________________________ │
│                                                     │
│     <OK>                    <Cancel>                │
└─────────────────────────────────────────────────────┘
gpg: key ACFB69E705016886 marked as ultimately trusted
gpg: revocation certificate stored as '/root/.gnupg/openpgp-revocs.d/DC12398CCC33A5349EB9663DF9D970AB18C9EDF6.rev'
public and secret key created and signed.

pub   rsa4096 2023-05-01 [SC]
      85778A4CE4DD04B7E07813ABACFB69E705016886
uid                      muchunjin (apache key) <muchunjin@apache.org>
sub   rsa4096 2023-05-01 [E]
```

Keys can be viewed through the `gpg --list-signatures` command

### 2.2 Upload the generated key to the public server

```shell
$ gpg --keyid-format SHORT --list-keys
/root/.gnupg/pubring.kbx
------------------------
pub   rsa4096/05016886 2023-05-01 [SC]
      85778A4CE4DD04B7E07813ABACFB69E705016886
uid         [ultimate] muchunjin (apache key) <muchunjin@apache.org>
sub   rsa4096/0C5A4E1C 2023-05-01 [E]

# Send public key to keyserver via key id
$ gpg --keyserver keyserver.ubuntu.com --send-key 05016886
# Among them, keyserver.ubuntu.com is the selected keyserver, it is recommended to use this, because the Apache Nexus verification uses this keyserver
```

#### 2.3 Check if the key is created successfully

Verify whether it is synchronized to the public network, it will take about a minute to find out the answer, if not successful, you can upload and retry multiple times.

```shell
$ gpg --keyserver keyserver.ubuntu.com --recv-keys 05016886   # If the following content appears, it means success
gpg: key ACFB69E705016886: "muchunjin (apache key) <muchunjin@apache.org>" not changed
gpg: Total number processed: 1
gpg:              unchanged: 1
```

Or enter <https://keyserver.ubuntu.com/> address in the browser, enter the name of the key and click 'Search key' to search if existed.

#### 2.4 Add the gpg public key to the KEYS file of the Apache SVN project repo

- Apache HertzBeat Branch Dev <https://dist.apache.org/repos/dist/dev/incubator/hertzbeat>
- Apache HertzBeat Branch Release <https://dist.apache.org/repos/dist/release/incubator/hertzbeat>

##### 2.4.1 Add public key to KEYS in dev branch

```shell
$ mkdir -p svn/dev
$ cd svn/dev

$ svn co https://dist.apache.org/repos/dist/dev/incubator/hertzbeat
$ cd svn/dev/hertzbeat

# Append the KEY you generated to the file KEYS, and check if it is added correctly
$ (gpg --list-sigs muchunjin@apache.org && gpg --export --armor muchunjin@apache.org) >> KEYS 

$ svn ci -m "add gpg key for muchunjin"
```

##### 2.4.2 Add public key to KEYS in release branch

```shell
$ mkdir -p svn/release
$ cd svn/release

$ svn co https://dist.apache.org/repos/dist/release/incubator/hertzbeat
$ cd svn/release/hertzbeat

# Append the KEY you generated to the file KEYS, and check if it is added correctly
$ (gpg --list-sigs muchunjin@apache.org && gpg --export --armor muchunjin@apache.org) >> KEYS 

$ svn ci -m "add gpg key for muchunjin"
```

## 3. Prepare material package & release

### Build Package

#### 3.1 Based on the master branch, create a release-${release_version}-rcx branch, such as release-1.6.0-rc1, And create a tag named v1.6.0-rc1 based on the release-1.6.0-rc1 branch, and set this tag as pre-release

```shell
git checkout master
git checkout -b release-1.6.0-rc1
```

#### 3.2 checkout release branch to local

```shell
git checkout release-1.6.0-rc1
```

#### 3.3 Compile the binary package

> Build HertzBeat server binary, run script in `web-app`

```shell
yarn install

yarn package
```

> run script in root

```shell
mvn clean package -Prelease
```

then

```shell
mvn clean install
```

> Build HertzBeat collector binary, run script in `collector`

```shell
mvn clean package -Pcluster
```

The release package are here:

- `dist/apache-hertzbeat-{version}-incubating-bin.tar.gz`
- `dist/apache-hertzbeat-collector-{version}-incubating-bin.tar.gz`
- `dist/apache-hertzbeat-{version}-incubating-docker-compose.tar.gz`

#### 3.4 Package the source code

> Package the project source code

```shell
git archive \
--format=tar.gz \
--output="dist/apache-hertzbeat-1.6.0-incubating-src.tar.gz" \
--prefix=apache-hertzbeat-1.6.0-incubating-src/ \
release-1.6.0-rc1
```

The archive package is here `dist/apache-hertzbeat-1.6.0-incubating-src.tar.gz`

### Sign package

#### 3.5 Sign binary and source packages

> The `gpg -u 33545C76`  `33545C76` is your gpg secret ID, see from `gpg --keyid-format SHORT --list-keys`

```shell
cd dist

# sign
for i in *.tar.gz; do echo $i; gpg -u 33545C76 --armor --output $i.asc --detach-sig $i ; done

# SHA512
for i in *.tar.gz; do echo $i; sha512sum $i > $i.sha512 ; done

# if macos sha512sum not found, you can install by brew install coreutils
```

> The final file list is as follows

```text
apache-hertzbeat-1.6.0-incubating-src.tar.gz
apache-hertzbeat-1.6.0-incubating-src.tar.gz.asc
apache-hertzbeat-1.6.0-incubating-src.tar.gz.sha512
apache-hertzbeat-1.6.0-incubating-bin.tar.gz
apache-hertzbeat-1.6.0-incubating-bin.tar.gz.asc
apache-hertzbeat-1.6.0-incubating-bin.tar.gz.sha512
apache-hertzbeat-1.6.0-incubating-docker-compose.tar.gz
apache-hertzbeat-1.6.0-incubating-docker-compose.tar.gz.asc
apache-hertzbeat-1.6.0-incubating-docker-compose.tar.gz.sha512
apache-hertzbeat-collector-1.6.0-incubating-bin.tar.gz
apache-hertzbeat-collector-1.6.0-incubating-bin.tar.gz.asc
apache-hertzbeat-collector-1.6.0-incubating-bin.tar.gz.sha512
```

#### 3.6 Verify signature

```shell
$ cd dist

# Verify signature
$ for i in *.tar.gz; do echo $i; gpg --verify $i.asc $i ; done

apache-hertzbeat-1.6.0-incubating-src.tar.gz
gpg: Signature made Tue May  2 12:16:35 2023 CST
gpg:                using RSA key 85778A4CE4DD04B7E07813ABACFB69E705016886
gpg: Good signature from "muchunjin (apache key) <muchunjin@apache.org>" [ultimate]
apache-hertzbeat_2.11-1.6.0-incubating-bin.tar.gz
gpg: Signature made Tue May  2 12:16:36 2023 CST
gpg:                using RSA key 85778A4CE4DD04B7E07813ABACFB69E705016886
gpg: Good signature from "muchunjin (apache key) <muchunjin@apache.org>" [ultimate]
apache-hertzbeat_2.12-1.6.0-incubating-bin.tar.gz
gpg: Signature made Tue May  2 12:16:37 2023 CST
gpg:                using RSA key 85778A4CE4DD04B7E07813ABACFB69E705016886
gpg: BAD signature from "muchunjin (apache key) <muchunjin@apache.org>" [ultimate]

# Verify SHA512
$ for i in *.tar.gz; do echo $i; sha512sum --check $i.sha512; done

apache-hertzbeat-1.6.0-incubating-src.tar.gz
apache-hertzbeat-1.6.0-incubating-src.tar.gz: OK
apache-hertzbeat-1.6.0-incubating-bin.tar.gz
apache-hertzbeat-1.6.0-incubating-bin.tar.gz: OK
apache-hertzbeat-1.6.0-incubating-docker-compose.tar.gz
apache-hertzbeat-1.6.0-incubating-docker-compose.tar.gz: OK
apache-hertzbeat-collector-1.6.0-incubating-bin.tar.gz
apache-hertzbeat-collector-1.6.0-incubating-bin.tar.gz: OK
```

#### 3.7 Publish the dev directory of the Apache SVN material package

- Clone the dev directory

```shell
# Check out the dev directory of the Apache SVN to the svn/dev directory under dist in the root directory of the Apache HertzBeat project
svn co https://dist.apache.org/repos/dist/dev/incubator/hertzbeat svn/dev

svn co --depth empty https://dist.apache.org/repos/dist/dev/incubator/hertzbeat
```

- Copy the material package to the dev directory

Create a version number directory and name it in the form of ${release_version}-${RC_version}. RC_version starts from 1, that is, the candidate version starts from RC1. During the release process, there is a problem that causes the vote to fail.  
If it needs to be corrected, it needs to iterate the RC version , the RC version number needs to be +1. For example: Vote for version 1.6.0-RC1. If the vote passes without any problems, the RC1 version material will be released as the final version material.  
If there is a problem (when the hertzbeat/incubator community votes, the voters will strictly check various release requirements and compliance issues) and need to be corrected, then re-initiate the vote after the correction, and the candidate version for the next vote is 1.6.0- RC2.

```shell
mkdir -p svn/dev/1.6.0-RC1
cp -f dist/* svn/dev/1.6.0-RC1
```

- Commit to SVN

```shell
cd svn/dev

# 1.check svn status
svn status

# 2. add to svn
svn add 1.6.0-RC1

svn status

# 3. Submit to svn remote server
svn commit -m "release for HertzBeat 1.6.0"
```

- Check Apache SVN Commit Results

> Visit the address <https://dist.apache.org/repos/dist/dev/incubator/hertzbeat/> in the browser, check if existed the new material package

## 4. Enter the community voting stage

### 4.1 Send a Community Vote Email

Send a voting email in the community requires at least three `+1` and no `-1`.

> `Send to`: <dev@hertzbeat.apache.org> <br />
> `Title`: [VOTE] Release Apache HertzBeat (incubating) 1.6.0 rc1 <br />
> `Body`:

```text
Hello HertzBeat Community:

This is a call for vote to release Apache HertzBeat (incubating) version release-1.6.0-RC1.

Apache HertzBeat - a real-time monitoring system with agentless, performance cluster, prometheus-compatible, custom monitoring and status page building capabilities.

Release notes:
https://github.com/apache/hertzbeat/releases/tag/v1.6.0-rc1

The release candidates:
https://dist.apache.org/repos/dist/dev/incubator/hertzbeat/1.6.0-RC1/

Git tag for the release:
https://github.com/apache/hertzbeat/releases/tag/v1.6.0-rc1

The artifacts signed with PGP key [33545C76], corresponding to [muchunjin@apache.org], that can be found in keys file:
https://downloads.apache.org/incubator/hertzbeat/KEYS

The vote will be open for at least 72 hours or until the necessary number of votes are reached.

Please vote accordingly:

[ ] +1 approve
[ ] +0 no opinion
[ ] -1 disapprove with the reason

*Valid check is a requirement for a vote. *Checklist for reference:

[ ] Download HertzBeat are valid.
[ ] Checksums and PGP signatures are valid.
[ ] Source code distributions have correct names matching the current
release.
[ ] LICENSE and NOTICE files are correct for each HertzBeat repo.
[ ] All files have license headers if necessary.
[ ] No compiled archives bundled in source archive.
[ ] Can compile from source.

More detail checklist please refer:
https://cwiki.apache.org/confluence/display/INCUBATOR/Incubator+Release+Checklist

Steps to validate the release，Please refer to:
https://hertzbeat.apache.org/docs/community/how_to_verify_release

How to Build:
https://hertzbeat.apache.org/docs/community/development/#build-hertzbeat-binary-package

Thanks!
```

After 72 hours, the voting results will be counted, and the voting result email will be sent, as follows.

> `Send to`: <dev@hertzbeat.apache.org> <br />
> `Title`: [RESULT]\[VOTE\] Release Apache HertzBeat (incubating) 1.6.0-rc1 <br />
> `Body`:

```text
Dear HertzBeat community,

Thanks for your review and vote for "Release Apache HertzBeat (incubating) 1.6.0-rc1"
I'm happy to announce the vote has passed:
---
4 binding +1, from:

- cc

1 non-binding +1, from:

- Roc Marshal
---
no 0 or -1 votes.

Vote thread:
https://lists.apache.org/thread/t01b2lbtqzyt7j4dsbdp5qjc3gngjsdq
---
Thank you to everyone who helped us to verify and vote for this release. We will move to the ASF Incubator voting shortly.
---
Best,
ChunJin Mu
```

One item of the email content is `Vote thread`, and the link is obtained here: <https://lists.apache.org/list.html?dev@hertzbeat.apache.org>

#### 3.2 Send Incubator Community voting mail

Send a voting email in the incubator community requires at least three `+1` and no `-1`.

> `Send to`: <general@incubator.apache.org> <br />
> `Title`: [VOTE] Release Apache HertzBeat (incubating) 1.6.0-rc1 <br />
> `Body`:

```text
Hello Incubator Community:

This is a call for a vote to release Apache HertzBeat (incubating) version 1.6.0-RC1.
The Apache HertzBeat community has voted on and approved a proposal to release Apache HertzBeat (incubating) version 1.6.0-RC1.
We now kindly request the Incubator PPMC members review and vote on this incubator release.
Apache HertzBeat, a real-time monitoring system with agentless, performance cluster, prometheus-compatible, custom monitoring and status page building capabilities.

HertzBeat community vote thread:
https://lists.apache.org/thread/t01b2lbtqzyt7j4dsbdp5qjc3gngjsdq

Vote result thread:
https://lists.apache.org/thread/t5z58mvrs1drgzfyc48c9lhmd8skswn7

The release candidate:
https://dist.apache.org/repos/dist/dev/incubator/hertzbeat/1.6.0-RC1/

Git tag for the release:
https://github.com/apache/hertzbeat/releases/tag/v1.6.0-rc1

The artifacts signed with PGP key [33545C76], corresponding to [muchunjin@apache.org], that can be found in keys file:
https://downloads.apache.org/incubator/hertzbeat/KEYS

The vote will be open for at least 72 hours or until the necessary number of votes are reached.

Please vote accordingly:
[ ] +1 approve
[ ] +0 no opinion
[ ] -1 disapprove with the reason

More detailed checklist please refer:
• https://cwiki.apache.org/confluence/display/INCUBATOR/Incubator+Release+Checklist

Steps to validate the release， Please refer to:
• https://www.apache.org/info/verification.html
• https://hertzbeat.apache.org/docs/community/how_to_verify_release
---
How to Build:
https://hertzbeat.apache.org/docs/community/development/#build-hertzbeat-binary-package
---
Thanks,

On behalf of Apache HertzBeat (incubating) community
---
Best,
ChunJin Mu
```

If there is no -1 after 72 hours, reply to the email as follows

> `Send to`: <general@incubator.apache.org> <br />
> `Body`:

```text
Thanks everyone for review and vote, 72H passed. I'll announce the vote result soon.

Best,
Chunjin Mu
```

Then the voting results will be counted, and the voting result email will be sent, as follows.

> `Send to`: <general@incubator.apache.org> <br />
> `Title`: [RESULT]\[VOTE\] Release Apache HertzBeat (incubating) 1.6.0-rc1 <br />
> `Body`:

```text
Hi Incubator Community,

The vote to release Apache HertzBeat (incubating) 1.6.0-rc4 has passed with 3 +1 binding and no +0 or -1 votes.

3 binding votes, no +0 or -1 votes.

+3 (binding) +1, from:
- xxx

no 0 or -1 votes.

Vote thread:

https://lists.apache.org/thread/m1kyn4l30y55p6q39m0ys5djvdd73h0f

Thanks everyone for your feedback and help with HertzBeat apache release. The HertzBeat team will take the steps to complete this release and will announce it soon.

Best,
ChunJin Mu
```

One item of the email content is `Vote thread`, and the link is obtained here: <https://lists.apache.org/list.html?general@incubator.apache.org>

Wait a day to see if the tutor has any other comments, if not, send the following announcement email

## 5. Complete the final publishing steps

### 5.1 Migrating source and binary packages

```shell
svn mv https://dist.apache.org/repos/dist/dev/incubator/hertzbeat/1.6.0-RC1 https://dist.apache.org/repos/dist/release/incubator/hertzbeat/1.6.0  -m "transfer packages for 1.6.0-RC1"
```

#### 4.2 Add the new version download address to the official website

<https://github.com/apache/hertzbeat/blob/master/home/docs/download.md>
<https://github.com/apache/hertzbeat/blob/master/home/i18n/zh-cn/docusaurus-plugin-content-docs/current/download.md>

Open the official website address <https://hertzbeat.apache.org/docs/download/> to see if there is a new version of the download

> It should be noted that the download link may take effect after an hour, so please pay attention to it.

#### 4.3 Generate a release on github

Update pre-release to create a tag named v1.6.0 based on the release-1.6.0-rc1 branch, and set this tag to latest release.

:::tip
You can modify it on the original RC Release without creating a new Release.
:::

Then enter Release Title and Describe

- Release Title:

```text
v1.6.0
```

- Describe:

```text
xxx
release note: xxx
```

Then click the `Publish release` button.

The rename the release-1.6.0-rc1 branch to release-1.6.0.

#### 4.5 Send new version announcement email

> `Send to`: <general@incubator.apache.org> <br />
> `cc`: <dev@hertzbeat.apache.org> <br />
> `Title`: [ANNOUNCE] Apache HertzBeat (incubating) 1.6.0 released <br />
> `Body`:

```text
Hi Community,

We are glad to announce the release of Apache HertzBeat (incubating) 1.6.0.
Thanks again for your help. 

Apache HertzBeat (https://hertzbeat.apache.org/) - a real-time monitoring system with agentless, performance cluster, prometheus-compatible, custom monitoring and status page building capabilities.

Download Link: 
https://hertzbeat.apache.org/docs/download/

Release Note: 
https://github.com/apache/hertzbeat/releases/tag/v1.6.0

Website: 
https://hertzbeat.apache.org/

HertzBeat Resources:
- Issue: https://github.com/apache/hertzbeat/issues
- Mailing list: dev@hertzbeat.apache.org
---
Apache HertzBeat Team
---
Best,
ChunJin Mu
```

This version release is over.

---

This doc refer from [Apache StreamPark](https://streampark.apache.org/)
