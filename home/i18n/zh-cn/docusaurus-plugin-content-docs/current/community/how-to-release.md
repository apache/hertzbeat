---
id: 'how_to_release'
title: 如何进行版本发布
sidebar_position: 4
---

本教程详细描述了如何发布Apache HertzBeat，并以1.6.0版本的发布为例。

## 1. 环境要求

此发布过程在Ubuntu OS中进行操作，并需要以下环境：

- JDK 17
- Apache Maven 3.x (此处使用 3.8.7)
- GnuPG 2.x
- Git
- SVN (Apache使用svn来托管项目发布)

> 注意需要设置环境变量 `export GPG_TTY=$(tty)`

## 2. 准备发布

> 首先整理帐户信息以更好地了解操作过程，稍后会多次使用。
- apache id: `muchunjin (APACHE LDAP 用户名)`
- apache passphrase: `APACHE LDAP 密钥`
- apache email: `muchunjin@apache.org`
- gpg real name: `muchunjin (任何名称均可用, 在这里我将其设置为与apache id相同的名称)`
- gpg key passphrase: `创建gpg密钥时设置的密码，你需要记住此密码`

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
Comment: for apache HertzBeat release create at 20230501 # Please enter some comments here
You selected this USER-ID:
    "muchunjin (for apache HertzBeat release create at 20230501) <muchunjin@apache.org>"

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
uid                      muchunjin (for apache HertzBeat release create at 20230501) <muchunjin@apache.org>
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
uid         [ultimate] muchunjin (for apache HertzBeat release create at 20230501) <muchunjin@apache.org>
sub   rsa4096/0C5A4E1C 2023-05-01 [E]

# Send public key to keyserver via key id
$ gpg --keyserver keyserver.ubuntu.com --send-key 584EE68E
# Among them, keyserver.ubuntu.com is the selected keyserver, it is recommended to use this, because the Apache Nexus verification uses this keyserver
```

#### 2.3 检查密钥是否创建成功

验证是否已经同步到公共网络，需要一分钟左右才能知道答案，如果不成功，您可以多次上传并重试。

```shell
$ gpg --keyserver keyserver.ubuntu.com --recv-keys 05016886   # If the following content appears, it means success
gpg: key ACFB69E705016886: "muchunjin (for apache HertzBeat release create at 20230501) <muchunjin@apache.org>" not changed
gpg: Total number processed: 1
gpg:              unchanged: 1
```

或者进入 https://keyserver.ubuntu.com/ 网址，输入密钥的名称，然后点击'Search key'

![图片](https://github.com/apache/Hertzbeat/assets/19602424/b8fe193e-c137-42b0-a833-90a6d975f335)

如果查询结果如下，表示密钥创建成功。

![图片](https://github.com/apache/Hertzbeat/assets/19602424/73ada3f2-2d2e-4b76-b25c-34a52db6a069)

#### 2.4 将 gpg 公钥添加到 Apache SVN 项目仓库的 KEYS 文件中

- Apache HertzBeat Dev分支 https://dist.apache.org/repos/dist/dev/incubator/hertzbeat
- Apache HertzBeat Release分支 https://dist.apache.org/repos/dist/release/incubator/hertzbeat/

##### 2.4.1 将公钥添加到dev分支的KEYS

```shell
$ mkdir -p hertzbeat_svn/dev
$ cd hertzbeat_svn/dev

$ svn co https://dist.apache.org/repos/dist/dev/incubator/hertzbeat
$ cd hertzbeat_svn/dev/hertzbeat

# 将生成的KEY追加到KEYS文件中，检查是否添加正确
$ (gpg --list-sigs muchunjin@apache.org && gpg --export --armor muchunjin@apache.org) >> KEYS 

$ svn ci -m "add gpg key for muchunjin"
```

##### 2.4.2 将公钥添加到release分支的KEYS

```shell
$ mkdir -p hertzbeat_svn/release
$ cd hertzbeat_svn/release

$ svn co https://dist.apache.org/repos/dist/release/incubator/hertzbeat/
$ cd hertzbeat_svn/release/hertzbeat

# 将生成的KEY追加到KEYS文件中，检查是否添加正确
$ (gpg --list-sigs muchunjin@apache.org && gpg --export --armor muchunjin@apache.org) >> KEYS 

$ svn ci -m "add gpg key for muchunjin"
```

#### 2.5 配置 apache maven 路径和用户密码设置

- 生成主密码
```shell
$ mvn --encrypt-master-password <apache password>
{EM+4/TYVDXYHRbkwjjAS3mE1RhRJXJUSG8aIO5RSxuHU26rKCjuS2vG+/wMjz9te}
```

- 创建文件 ${user.home}/.m2/settings-security.xml 并配置上一步创建的密码

```shell
<settingsSecurity>
  <master>{EM+4/TYVDXYHRbkwjjAS3mE1RhRJXJUSG8aIO5RSxuHU26rKCjuS2vG+/wMjz9te}</master>
</settingsSecurity>
```

- 生成最终的加密密码并将其添加到 ~/.m2/settings.xml 文件

```shell
$ mvn --encrypt-password <apache passphrase>
{/ZLaH78TWboH5IRqNv9pgU4uamuqm9fCIbw0gRWT01c=}
```

> 在maven配置文件~/.m2/settings.xml中，添加以下服务端项

```
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0 http://maven.apache.org/xsd/settings-1.0.0.xsd">
  
  <localRepository>/path/to/local/repo</localRepository>
  
  <servers>
    <server>
        <id>apache.snapshots.https</id>
        <!-- APACHE LDAP UserName --> 
        <username>muchunjin</username>
        <!-- APACHE LDAP password (填写刚刚使用命令 `mvn --encrypt-password <apache passphrase>` 创建的密码) -->
        <password>{/ZLaH78TWboH5IRqNv9pgU4uamuqm9fCIbw0gRWT01c=}</password>
    </server>
    <server>
        <id>apache.releases.https</id>
        <!-- APACHE LDAP UserName --> 
        <username>muchunjin</username>
        <!-- APACHE LDAP password (填写刚刚使用命令 `mvn --encrypt-password <apache passphrase>` 创建的密码) -->
        <password>{/ZLaH78TWboH5IRqNv9pgU4uamuqm9fCIbw0gRWT01c=}</password>
    </server>
  </servers>

  <profiles>
        <profile>
          <id>apache-release</id>
          <properties>
            <gpg.keyname>05016886</gpg.keyname>
            <!-- Use an agent: Prevents being asked for the password during the build -->
            <gpg.useagent>true</gpg.useagent>
            <gpg.passphrase>passphrase for your gpg key</gpg.passphrase>
          </properties>
        </profile>
  </profiles>
```

## 3. 准备物料 & 发布到Apache Nexus

#### 3.1 基于dev分支，创建一个名为release-${release_version}-rcx的分支，例如release-2.1.0-rc1。并基于release-2.1.0-rc1分支创建一个名为v2.1.0-rc1的标签，并将此标签设置为预发布。

![图片](https://user-images.githubusercontent.com/19602424/236656362-1d346faa-6582-44eb-9722-8bb2de0eaa92.png)

#### 3.2 克隆发布分支到本地

```shell
git clone -b release-2.1.0-rc1 -c core.autocrlf=false git@github.com:apache/hertzbeat.git
```

#### 3.3 发布相关JAR到Apache Nexus

##### 3.3.1 发布scala 2.11到Apache Nexus仓库 

```shell
mvn clean install \
-Pscala-2.11 \
-DskipTests \
-Dcheckstyle.skip=true \
-Dmaven.javadoc.skip=true \
-pl 'hertzbeat-common,hertzbeat-flink' \
-pl '!hertzbeat-console/hertzbeat-console-service' \
-amd
```

```shell
mvn deploy \
-Pscala-2.11,apache-release \
-DskipTests \
-Dmaven.javadoc.skip=true \
-DretryFailedDeploymentCount=3
```

##### 3.3.2 发布scala 2.12到Apache Nexus仓库

```shell
mvn clean install \
-Pscala-2.12 \
-DskipTests \
-Dcheckstyle.skip=true \
-Dmaven.javadoc.skip=true \
-pl 'hertzbeat-common,hertzbeat-flink' \
-pl '!hertzbeat-console/hertzbeat-console-service' \
-amd
```

```shell
mvn deploy \
-Pscala-2.12,apache-release \
-DskipTests \
-Dmaven.javadoc.skip=true \
-DretryFailedDeploymentCount=3
```

```shell
mvn deploy \
-Papache-release \
-DskipTests \
-Dmaven.javadoc.skip=true \
-DretryFailedDeploymentCount=3
```

##### 3.3.3 检查是否成功发布到Apache Nexus仓库

> 访问 https://repository.apache.org/ 并登录，如果有scala 2.11、scala 2.12，说明发布成功。

![图片](https://user-images.githubusercontent.com/19602424/236657233-08d142eb-5f81-427b-a04d-9ab3172199c1.png)

#### 3.4 编译二进制包

> Scala 2.11 编译打包

```shell
> ./build.sh # 选择 "mixed mode" 和 "scala 2.11"
```

> Scala 2.12 编译打包

```shell
> ./build.sh # 选择 "mixed mode" 和 "scala 2.12"
```

> 打包项目源码

```shell
git archive \
--format=tar.gz \
--output="dist/apache-hertzbeat-2.1.0-incubating-src.tar.gz" \
--prefix=apache-hertzbeat-2.1.0-incubating-src/ \
release-2.1.0-rc1
```

> 会生成以下3个文件

```
apache-hertzbeat-2.1.0-incubating-src.tar.gz
apache-hertzbeat_2.11-2.1.0-incubating-bin.tar.gz
apache-hertzbeat_2.12-2.1.0-incubating-bin.tar.gz
```

#### 3.4 对二进制和源码包进行签名

```shell
cd dist

# sign
for i in *.tar.gz; do echo $i; gpg --armor --output $i.asc --detach-sig $i ; done

# SHA512
for i in *.tar.gz; do echo $i; sha512sum $i > $i.sha512 ; done
```

> 最终文件列表如下

```
apache-hertzbeat-2.1.0-incubating-src.tar.gz
apache-hertzbeat-2.1.0-incubating-src.tar.gz.asc
apache-hertzbeat-2.1.0-incubating-src.tar.gz.sha512
apache-hertzbeat_2.11-2.1.0-incubating-bin.tar.gz
apache-hertzbeat_2.11-2.1.0-incubating-bin.tar.gz.asc
apache-hertzbeat_2.11-2.1.0-incubating-bin.tar.gz.sha512
apache-hertzbeat_2.12-2.1.0-incubating-bin.tar.gz
apache-hertzbeat_2.12-2.1.0-incubating-bin.tar.gz.asc
apache-hertzbeat_2.12-2.1.0-incubating-bin.tar.gz.sha512
```

#### 3.5 验证签名

```shell
$ cd dist

# 验证签名
$ for i in *.tar.gz; do echo $i; gpg --verify $i.asc $i ; done

apache-hertzbeat-2.1.0-incubating-src.tar.gz
gpg: Signature made Tue May  2 12:16:35 2023 CST
gpg:                using RSA key 85778A4CE4DD04B7E07813ABACFB69E705016886
gpg: Good signature from "muchunjin (for apache HertzBeat release create at 20230501) <muchunjin@apache.org>" [ultimate]
apache-hertzbeat_2.11-2.1.0-incubating-bin.tar.gz
gpg: Signature made Tue May  2 12:16:36 2023 CST
gpg:                using RSA key 85778A4CE4DD04B7E07813ABACFB69E705016886
gpg: Good signature from "muchunjin (for apache HertzBeat release create at 20230501) <muchunjin@apache.org>" [ultimate]
apache-hertzbeat_2.12-2.1.0-incubating-bin.tar.gz
gpg: Signature made Tue May  2 12:16:37 2023 CST
gpg:                using RSA key 85778A4CE4DD04B7E07813ABACFB69E705016886
gpg: BAD signature from "muchunjin (for apache HertzBeat release create at 20230501) <muchunjin@apache.org>" [ultimate]

# 验证 SHA512
$ for i in *.tar.gz; do echo $i; sha512sum --check $i.sha512; done

apache-hertzbeat-2.1.0-incubating-src.tar.gz
apache-hertzbeat-2.1.0-incubating-src.tar.gz: OK
apache-hertzbeat_2.11-2.1.0-incubating-bin.tar.gz
apache-hertzbeat_2.11-2.1.0-incubating-bin.tar.gz: OK
apache-hertzbeat_2.12-2.1.0-incubating-bin.tar.gz
apache-hertzbeat_2.12-2.1.0-incubating-bin.tar.gz: OK
```

#### 3.6 发布Apache SVN仓库中dev目录的物料包

```shell
# 检出Apache SVN仓库中的dev目录到Apache HertzBeat™项目根目录下的dist/hertzbeat_svn_dev目录下
svn co https://dist.apache.org/repos/dist/dev/incubator/hertzbeat dist/hertzbeat_svn_dev

svn co --depth empty https://dist.apache.org/repos/dist/dev/incubator/hertzbeat
```

创建一个版本号目录，并以${release_version}-${RC_version}的形式命名。RC_version从1开始，即候选版本从RC1开始。在发布过程中，如果出现导致投票失败的问题，需要进行修正，那么RC版本需要迭代，RC版本号需要+1。例如：为版本2.1.0-RC1投票。如果投票顺利通过，那么RC1版本的资料将作为最终版本的资料发布。如果出现问题（当hertzbeat/incubator社区进行投票时，投票者会严格检查各种发布要求和合规问题）并需要纠正，那么修正后重新启动投票，下一次的候选版本为2.1.0-RC2。

```shell
mkdir -p dist/hertzbeat_svn_dev/2.1.0-RC1
cp -f dist/* dist/hertzbeat_svn_dev/2.1.0-RC1
```

提交到SVN

```shell
cd dist/hertzbeat_svn_dev/

# 1. 检查svn状态
svn status

# 2. 添加到svn
svn add 2.0.0-RC1

svn status

# 3. 提交到svn远端服务器
svn commit -m "release for HertzBeat 2.1.0"
```

#### 3.7 检查Apache SVN提交结果

> 在浏览器中访问 https://dist.apache.org/repos/dist/dev/incubator/hertzbeat/2.1.0-RC1/

![图片](https://github.com/apache/hertzbeat/assets/19602424/e4763537-af9f-4f2a-967d-912e6670b360)

## 3. 进入社区投票阶段

#### 3.1 发送社区投票邮件

发送社区投票邮件需要至少三个`+1`，且无`-1`。

> `Send to`: dev@hertzbeat.apache.org <br />
> `Title`: [VOTE] Release Apache HertzBeat (Incubating) 2.1.0 rc1 <br />
> `Body`: 

```
Hello HertzBeat Community:

This is a call for vote to release Apache HertzBeat(Incubating) version release-2.1.0-RC1.

Apache Streamark - Make stream processing easier! Easy-to-use streaming application development framework and operation platform.

Release notes:
https://hertzbeat.apache.org/download/release-note/2.1.0/

The release candidates:
https://dist.apache.org/repos/dist/dev/incubator/hertzbeat/2.1.0-RC1/

Maven artifacts are available in a staging repository at:
https://repository.apache.org/content/repositories/orgapachehertzbeat-1012/

Git tag for the release:
https://github.com/apache/hertzbeat/releases/tag/v2.1.0-rc1

The artifacts signed with PGP key [05016886], corresponding to [muchunjin@apache.org], that can be found in keys file:
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
https://hertzbeat.apache.org/community/release/how-to-verify

How to Build:

1.cd hertzbeat
2.sh ./build.sh

Thanks!
```

在72小时后，将统计投票结果，并发送投票结果邮件，如下所示。

> `Send to`: dev@hertzbeat.apache.org <br />
> `Title`: [RESULT][VOTE] Release Apache HertzBeat (Incubating) 2.1.0-rc1 <br />
> `Body`:

```
Dear HertzBeat community,

Thanks for your review and vote for "Release Apache HertzBeat (Incubating) 2.1.0-rc1"
I'm happy to announce the vote has passed:


4 binding +1, from:

- Zhuoyu Chen
- Huajie Wang
- Linying Yu
- Shaokang Lv

1 non-binding +1, from:

- Roc Marshal


no 0 or -1 votes.

Vote thread:
https://lists.apache.org/thread/t01b2lbtqzyt7j4dsbdp5qjc3gngjsdq


Thank you to everyone who helped us to verify and vote for this release. We will move to the ASF Incubator voting shortly.


Best,
ChunJin Mu
```

邮件内容中的一项是`Vote thread`，链接获取方式如下：<br />
访问此地址 https://lists.apache.org/list.html?dev@hertzbeat.apache.org ， 找到邮件标题并点击显示投票内容

![图片](https://github.com/apache/Hertzbeat/assets/19602424/5755ed06-529f-4739-96a8-1ac13bbb21ea)

右键点击标题，点击复制链接地址获取链接

![图片](https://github.com/apache/Hertzbeat/assets/19602424/1616da5b-7891-45cc-b956-a0ba5e7ce874)

#### 3.2 发送孵化社区投票邮件

发送孵化社区投票邮件需要至少三个`+1`，且无`-1`。

> `Send to`: general@incubator.apache.org <br />
> `cc`: dev@hertzbeat.apache.org、tison@apache.org、willem.jiang@gmail.com <br />
> `Title`: [VOTE] Release Apache HertzBeat(Incubating) 2.1.0-rc1 <br />
> `Body`:

```
Hello Incubator Community:

This is a call for a vote to release Apache HertzBeat(Incubating) version 2.1.0-RC1.
The Apache HertzBeat community has voted on and approved a proposal to release Apache HertzBeat(Incubating) version 2.1.0-RC1.
We now kindly request the Incubator PMC members review and vote on this incubator release.
Apache HertzBeat, Make stream processing easier! Easy-to-use streaming application development framework and operation platform.

HertzBeat community vote thread:
https://lists.apache.org/thread/t01b2lbtqzyt7j4dsbdp5qjc3gngjsdq

Vote result thread:
https://lists.apache.org/thread/t5z58mvrs1drgzfyc48c9lhmd8skswn7

The release candidate:
https://dist.apache.org/repos/dist/dev/incubator/hertzbeat/2.1.0-RC1/

Git tag for the release:
https://github.com/apache/hertzbeat/releases/tag/v2.1.0-rc1

Maven artifacts are available in a staging repository at:
https://repository.apache.org/content/repositories/orgapachehertzbeat-1012/

The artifacts signed with PGP key [05016886], corresponding to [muchunjin@apache.org], that can be found in keys file:
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
• https://hertzbeat.apache.org/community/release/how-to-verify


How to Build:

1) clone source code:
> git clone -b v2.1.0-rc1 git@github.com:apache/hertzbeat.git

2) build project:
> cd hertzbeat && sh ./build.sh


Thanks,

On behalf of Apache HertzBeat(Incubating) community


Best,
ChunJin Mu
```

如果72小时后没有-1，回复邮件如下

> `Send to`: general@incubator.apache.org <br />
> `cc`: dev@hertzbeat.apache.org <br />
> `Body`:

```
Thanks everyone for review and vote, 72H passed. I'll announce the vote result soon.

Best,
Chunjin Mu
```

然后将统计投票结果，并发送投票结果邮件，如下所示。

> `Send to`: general@incubator.apache.org <br />
> `cc`: dev@hertzbeat.apache.org、tison@apache.org、willem.jiang@gmail.com <br />
> `Title`: [RESULT][VOTE] Release Apache HertzBeat(Incubating) 2.1.0-rc1 <br />
> `Body`:

```
Hi all,

Thanks for your review and vote for "Release Apache HertzBeat (Incubating) 2.1.0-rc1"
I'm happy to announce the vote has passed:

3 binding votes, no +0 or -1 votes.
Thanks for reviewing and voting.

+3 (binding) +1, from:
- tison
- Gang Li
- Willem Jiang

no 0 or -1 votes.

Vote thread:
https://lists.apache.org/thread/k3cvcbzxqs6qy62d1o6r9pqpykcgvvhm


Thanks everyone for your feedback and help with HertzBeat apache release. The HertzBeat team will take the steps to complete this release and will announce it soon.

Best,
ChunJin Mu
```

邮件内容中的一项是`Vote thread`，链接获取方式如下：<br />
访问此地址 https://lists.apache.org/list.html?general@incubator.apache.org ， 找到邮件标题并点击显示投票内容

![图片](https://github.com/apache/Hertzbeat/assets/19602424/aea68925-7911-4413-8b2d-aea12685337f)

右键点击标题，点击复制链接地址获取链接

等待一天，查看看导师是否有其他意见，如果没有，发送以下公告邮件

## 4. 完成最终发布步骤

#### 4.1 迁移源代码和二进制包

```shell
svn mv https://dist.apache.org/repos/dist/dev/incubator/hertzbeat/2.1.0-RC1 https://dist.apache.org/repos/dist/release/incubator/hertzbeat/2.1.0  -m "transfer packages for 2.1.0-RC1"
```

#### 4.2 发布版本到Apache Staging仓库

- 登录 http://repository.apache.org ，使用你的Apache账号登录
- 点击左侧的 Staging repositories
- 选择你最近上传的仓库，投票邮件中指定的仓库
- 点击上方的Release按钮，这个过程会进行一系列的检查
> 仓库同步到其他数据源通常需要24小时左右

#### 4.3 添加新版本下载地址到官网

添加以下内容到官网的src/pages/download/data.json文件中

```
{
    "version": "2.1.0",
    "date": "2023-05-11"
}
```

最终文件内容如下

```
[
    {
    "version": "2.0.0",
    "date": "2023-02-21"
    },
    {
    "version": "2.1.0",
    "date": "2023-05-11"
    }
]
```

打开官网地址 https://hertzbeat.apache.org/download/ 查看是否有新版本的下载

> 需要注意的是，下载链接可能需要一个小时后才会生效，请注意。

![图片](https://github.com/apache/hertzbeat/assets/19602424/e7900fb2-7bfc-4fa1-bd40-9806e6a822ef)

#### 4.4 在github上生成release

基于release-2.1.0-rc1分支创建一个名为v2.1.0的标签，并将此标签设置为latest release。

然后输入发版标题和描述

- 发版标题: 
```
v2.1.0-incubating
```
- 描述:
```
Release-2.1.0-incubating
release note: https://hertzbeat.apache.org/download/release-note/2.1.0
```

![图片](https://github.com/apache/Hertzbeat/assets/19602424/84723ff5-a295-471d-8265-1b8ef867c3d1)

然后点击`Publish release`按钮。

然后将release-2.1.0-rc1分支重命名为release-2.1.0。

#### 4.5 发送新版本公告邮件

> `Send to`: general@incubator.apache.org <br />
> `cc`: dev@hertzbeat.apache.org <br />
> `Title`: [ANNOUNCE] Release Apache HertzBeat (Incubating) 2.1.0 <br />
> `Body`:

```
Hi all,

We are glad to announce the release of Apache HertzBeat(incubating) 2.1.0.
Once again I would like to express my thanks to your help.

Apache HertzBeat(https://hertzbeat.apache.org/) - Make stream processing easier! Easy-to-use streaming application development framework and operation platform.

Download Links: https://hertzbeat.apache.org/download/
Release Notes: https://hertzbeat.apache.org/download/release-note/2.1.0

HertzBeat Resources:
- Issue: https://github.com/apache/hertzbeat/issues
- Mailing list: dev@hertzbeat.apache.org

- Apache HertzBeat Team

Best,
ChunJin Mu
```

该版本的发布顺利结束。

This doc refer from [Apache Hertzbeat](https://Hertzbeat.apache.org/)   
