---
id: 'how_to_release'
title: 如何进行版本发布
sidebar_position: 4
---

本教程详细描述了如何发布Apache HertzBeat，并以 v1.6.0 版本的发布为例。

## 1. 环境要求

此发布过程在 UbuntuOS(可在 Windows Mac) 中进行操作，并需要以下环境：

- JDK 17
- Node18 Yarn
- Apache Maven 3.x
- GnuPG 2.x
- Git
- SVN (Apache使用svn来托管项目发布)

> 注意需要设置环境变量 `export GPG_TTY=$(tty)`

## 2. 准备发布

> 首先整理帐户信息以更好地了解操作过程，稍后会多次使用。
>
> - apache id: `muchunjin (APACHE LDAP 用户名)`
> - apache passphrase: `APACHE LDAP 密钥`
> - apache email: `muchunjin@apache.org`
> - gpg real name: `muchunjin (任何名称均可用, 在这里我将其设置为与apache id相同的名称)`
> - gpg key passphrase: `创建gpg密钥时设置的密码，你需要记住此密码`

### 2.1 生成密钥

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

密钥可以通过`gpg --list-signatures`命令查看

### 2.2 将生成的密钥上传到公共服务器

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

#### 2.3 检查密钥是否创建成功

验证是否已经同步到公共网络，需要一分钟左右才能知道答案，如果不成功，您可以多次上传并重试。

```shell
$ gpg --keyserver keyserver.ubuntu.com --recv-keys 05016886   # If the following content appears, it means success
gpg: key ACFB69E705016886: "muchunjin (apache key) <muchunjin@apache.org>" not changed
gpg: Total number processed: 1
gpg:              unchanged: 1
```

或者进入 <https://keyserver.ubuntu.com/> 网址，输入密钥的名称，然后点击'Search key' 按钮，查看是否有对应名称的密钥。

#### 2.4 将 gpg 公钥添加到 Apache SVN 项目仓库的 KEYS 文件中

- Apache HertzBeat Dev 分支 <https://dist.apache.org/repos/dist/dev/incubator/hertzbeat>
- Apache HertzBeat Release 分支 <https://dist.apache.org/repos/dist/release/incubator/hertzbeat>

##### 2.4.1 将公钥添加到dev分支的KEYS

```shell
$ mkdir -p svn/dev
$ cd svn/dev

$ svn co https://dist.apache.org/repos/dist/dev/incubator/hertzbeat
$ cd svn/dev/hertzbeat

# 将生成的KEY追加到KEYS文件中，检查是否添加正确
$ (gpg --list-sigs muchunjin@apache.org && gpg --export --armor muchunjin@apache.org) >> KEYS 

$ svn ci -m "add gpg key for muchunjin"
```

##### 2.4.2 将公钥添加到release分支的KEYS

```shell
$ mkdir -p svn/release
$ cd svn/release

$ svn co https://dist.apache.org/repos/dist/release/incubator/hertzbeat
$ cd svn/release/hertzbeat

# 将生成的KEY追加到KEYS文件中，检查是否添加正确
$ (gpg --list-sigs muchunjin@apache.org && gpg --export --armor muchunjin@apache.org) >> KEYS 

$ svn ci -m "add gpg key for muchunjin"
```

## 3. 准备物料 & 发布

### 准备发布物料

#### 3.1 基于 master 分支，创建一个名为 release-${release_version}-rcx 的分支，例如 release-1.6.0-rc1。并基于 release-1.6.0-rc1 分支创建一个名为 v1.6.0-rc1 的标签，并将此标签设置为预发布

```shell
git checkout master
git checkout -b release-1.6.0-rc1
```

#### 3.2 本地切换到待发布分支

```shell
git checkout release-1.6.0-rc1
```

#### 3.3 编译二进制包

> HertzBeat 编译打包，在项目`web-app`目录下执行以下命令，

```shell
yarn install

yarn package
```

> 在项目根目录下执行以下命令

```shell
mvn clean package -Prelease
```

然后

```shell
mvn clean install
```

> HertzBeat-Collector 编译打包，在项目`collector`目录下执行以下命令

```shell
mvn clean package -Pcluster
```

生成的二进制包在:

- `dist/apache-hertzbeat-{version}-incubating-bin.tar.gz`
- `dist/apache-hertzbeat-collector-{version}-incubating-bin.tar.gz`
- `dist/apache-hertzbeat-{version}-incubating-docker-compose.tar.gz`

#### 3.4 打包项目源代码

> 打包项目源码

```shell
git archive \
--format=tar.gz \
--output="dist/apache-hertzbeat-1.6.0-incubating-src.tar.gz" \
--prefix=apache-hertzbeat-1.6.0-incubating-src/ \
release-1.6.0-rc1
```

生成的代码归档文件在 `dist/apache-hertzbeat-1.6.0-incubating-src.tar.gz`

### 签名发布物料

#### 3.5 对二进制和源码包进行签名

将上步骤生成的三个文件包放到`dist`目录下(若无则新建目录)，然后对文件包进行签名和SHA512校验和生成。

> 其中 `gpg -u 33545C76` 的 `33545C76` 是你的 GPG 密钥 ID，可以通过 `gpg --keyid-format SHORT --list-keys` 查看。

```shell
cd dist

# sign
for i in *.tar.gz; do echo $i; gpg -u 33545C76 --armor --output $i.asc --detach-sig $i ; done

# SHA512
for i in *.tar.gz; do echo $i; sha512sum $i > $i.sha512 ; done

# if macos sha512sum not found, you can install by brew install coreutils
```

> 最终文件列表如下

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

#### 3.6 验证签名

```shell
$ cd dist

# 验证签名
$ for i in *.tar.gz; do echo $i; gpg --verify $i.asc $i ; done

apache-hertzbeat-1.6.0-incubating-src.tar.gz
gpg: Signature made Tue May  2 12:16:35 2023 CST
gpg:                using RSA key 85778A4CE4DD04B7E07813ABACFB69E705016886
gpg: Good signature from "muchunjin (apache key) <muchunjin@apache.org>" [ultimate]
apache-hertzbeat-1.6.0-incubating-bin.tar.gz
gpg: Signature made Tue May  2 12:16:36 2023 CST
gpg:                using RSA key 85778A4CE4DD04B7E07813ABACFB69E705016886
gpg: Good signature from "muchunjin (apache key) <muchunjin@apache.org>" [ultimate]
apache-hertzbeat-collector-1.6.0-incubating-bin.tar.gz
gpg: Signature made Tue May  2 12:16:37 2023 CST
gpg:                using RSA key 85778A4CE4DD04B7E07813ABACFB69E705016886
gpg: BAD signature from "muchunjin (apache key) <muchunjin@apache.org>" [ultimate]

# 验证 SHA512
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

#### 3.7 发布 Apache SVN 仓库中 dev 目录的物料包

- 检出仓库

```shell
# 检出 Apache SVN 仓库中的 dev/incubator/hertzbeat 目录到 Apache HertzBeat™ 项目根目录下的 svn/dev 目录下
svn co https://dist.apache.org/repos/dist/dev/incubator/hertzbeat svn/dev

svn co --depth empty https://dist.apache.org/repos/dist/dev/incubator/hertzbeat
```

- 复制物料包到 SVN 仓库

创建一个版本号目录，并以${release_version}-${RC_version}的形式命名。RC_version从1开始，即候选版本从RC1开始。在发布过程中，如果出现导致投票失败的问题，需要进行修正，那么RC版本需要迭代，RC版本号需要+1。例如：为版本1.6.0-RC1投票。如果投票顺利通过，那么RC1版本的资料将作为最终版本的资料发布。如果出现问题（当hertzbeat/incubator社区进行投票时，投票者会严格检查各种发布要求和合规问题）并需要纠正，那么修正后重新启动投票，下一次的候选版本为1.6.0-RC2。

```shell
mkdir -p svn/dev/1.6.0-RC1
cp -f dist/* svn/dev/1.6.0-RC1
```

- 提交到SVN

```shell
cd svn/dev

# 1. 检查svn状态
svn status

# 2. 添加到svn
svn add 1.6.0-RC1

svn status

# 3. 提交到svn远端服务器
svn commit -m "release for HertzBeat 1.6.0-RC1"
```

- 检查 Apache SVN 提交结果

> 在浏览器中访问 <https://dist.apache.org/repos/dist/dev/incubator/hertzbeat/> , 检查是否有新的版本内容

## 4. 进入社区投票阶段

### 4.1 发送社区投票邮件

发送社区投票邮件需要至少三个`+1`，且无`-1`。

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

在72小时后，将统计投票结果，并发送投票结果邮件，如下所示。

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

邮件内容中的一项是`Vote thread`，在 <https://lists.apache.org/list.html?dev@hertzbeat.apache.org> 查看获取

### 3.2 发送孵化社区投票邮件

发送孵化社区投票邮件需要至少三个`+1`，且无`-1`。

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

如果72小时后没有-1，回复邮件如下

> `Send to`: <general@incubator.apache.org> <br />
> `Body`:

```text
Thanks everyone for review and vote, 72H passed. I'll announce the vote result soon.

Best,
Chunjin Mu
```

然后将统计投票结果，并发送投票结果邮件，如下所示。

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

邮件内容中的一项是`Vote thread`，在 <https://lists.apache.org/list.html?general@incubator.apache.org> 查看获取

等待一天，查看看导师是否有其他意见，如果没有，发送以下公告邮件

## 4. 完成最终发布步骤

### 4.1 迁移源代码和二进制包

```shell
svn mv https://dist.apache.org/repos/dist/dev/incubator/hertzbeat/1.6.0-RC1 https://dist.apache.org/repos/dist/release/incubator/hertzbeat/1.6.0  -m "transfer packages for 1.6.0-RC1"
```

### 4.2 添加新版本下载地址到官网

<https://github.com/apache/hertzbeat/blob/master/home/docs/download.md>
<https://github.com/apache/hertzbeat/blob/master/home/i18n/zh-cn/docusaurus-plugin-content-docs/current/download.md>

完成后打开官网地址 <https://hertzbeat.apache.org/docs/download/> 查看是否有新版本的下载

> 需要注意的是，下载链接可能需要一个小时后才会生效，请注意。

### 4.3 Github 生成 Release

基于 release-1.6.0-rc1 分支修改创建一个名为 v1.6.0 的标签，并将此标签设置为 latest release。

:::tip
在原有的 Release 上面修改，无需重新创建 Release。
:::

然后输入发版标题和描述

- 发版标题:

```text
v1.6.0
```

- 描述:

```text
xxx
release note: xxx
```

然后点击`Publish release`按钮。

然后将 release-1.6.0-rc1 分支重命名 为 release-1.6.0。

### 4.4 发送新版本公告邮件

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

Best,
ChunJin Mu
```

该版本的发布顺利结束。

---

This doc refer from [Apache StreamPark](https://streampark.apache.org/)
