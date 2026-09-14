---
id: 'how_to_release'
title: 如何进行版本发布
sidebar_position: 4
---

本教程详细描述了如何发布 Apache HertzBeat。

:::caution 开始之前：本文中需要替换的变量
文中的命令和邮件模板使用了占位符，执行前请全部替换为你自己的值，**不要直接复制粘贴**。

| 占位符 | 含义 | 示例 |
| --- | --- | --- |
| `{version}` | 发布版本号 | `1.9.0` |
| `RC1` | 候选版本号，从 1 开始，每次重新投票 +1 | `RC2` |
| `<YOUR_APACHE_ID>` | 你的 Apache LDAP 用户名 | `duansg` |
| `<YOUR_APACHE_ID>@apache.org` | 你的 Apache 邮箱 | `duansg@apache.org` |
| `<YOUR_KEY_ID>` | 你的 GPG 短密钥 ID，`gpg --keyid-format SHORT --list-keys` 可查看 | `EF04C474` |
| `<YOUR_NAME>` | 邮件署名 | `Duan SiGuo` |

文中代码块里的**命令输出示例**（如 `gpg` 的回显、签名校验结果）保留了具体值，仅供对照格式，你实际看到的会是自己的信息。
:::

## 1. 环境要求

此发布过程在 UbuntuOS(可在 Windows Mac) 中进行操作，并需要以下环境：

- JDK 25
- Node18 pnpm
- Apache Maven 3.x
- GnuPG 2.x
- Git
- SVN (Apache使用svn来托管项目发布)

> 注意需要设置环境变量 `export GPG_TTY=$(tty)`

## 2. 准备发布

> 首先整理帐户信息以更好地了解操作过程，稍后会多次使用。
>
> - apache id: `<YOUR_APACHE_ID>` (APACHE LDAP 用户名)
> - apache passphrase: `APACHE LDAP 密钥`
> - apache email: `<YOUR_APACHE_ID>@apache.org`
> - gpg real name: `<YOUR_APACHE_ID>` (任何名称均可用, 建议设置为与 apache id 相同的名称)
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
`<n>` = key expires in n days
`<n>`w = key expires in n weeks
`<n>`m = key expires in n months
`<n>`y = key expires in n years
Key is valid for? (0) 0 # Please enter 0
Key does not expire at all
Is this correct? (y/N) y # Please enter y here

GnuPG needs to construct a user ID to identify your key.

Real name: <YOUR_APACHE_ID> # Please enter 'gpg real name'
Email address: <YOUR_APACHE_ID>@apache.org # Please enter your apache email address here
Comment: apache key # Please enter some comments here
You selected this USER-ID:
    "duansg (apache key) [duansg@apache.org](mailto:duansg@apache.org)"

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
│     `<OK>`                    `<Cancel>`                │
└─────────────────────────────────────────────────────┘

# Here you need to re-enter the password in the previous step.
┌─────────────────────────────────────────────────────┐
│ Please re-enter this passphrase                     │
│                                                     │
│ Passphrase: _______________________________________ │
│                                                     │
│     `<OK>`                    `<Cancel>`                │
└─────────────────────────────────────────────────────┘
gpg: directory '/Users/duansg/.gnupg/openpgp-revocs.d' created
gpg: revocation certificate stored as '/Users/duansg/.gnupg/openpgp-revocs.d/C787268D3396367EB3C2242402CA7E2CEF04C474.rev'
public and secret key created and signed.

pub   rsa4096 2026-07-27 [SC]
      C787268D3396367EB3C2242402CA7E2CEF04C474
uid                      duansg <duansg@apache.org>
sub   rsa4096 2026-07-27 [E]
```

密钥可以通过`gpg --list-signatures` 或者 `gpg --keyid-format SHORT --list-keys` 命令查看

### 2.2 将生成的密钥上传到公共服务器

```shell
$ gpg --keyid-format SHORT --list-keys
------------------------
pub   rsa4096/EF04C474 2026-07-27 [SC]
      C787268D3396367EB3C2242402CA7E2CEF04C474
uid         [ultimate] duansg <duansg@apache.org>
sub   rsa4096/E955F059 2026-07-27 [E]

# Send public key to keyserver via key id
$ gpg --keyserver hkps://keyserver.ubuntu.com:443 --send-key <YOUR_KEY_ID>
# Among them, keyserver.ubuntu.com is the selected keyserver, it is recommended to use this, because the Apache Nexus verification uses this keyserver
```

#### 2.3 检查密钥是否创建成功

验证是否已经同步到公共网络，需要一分钟左右才能知道答案，如果不成功，您可以多次上传并重试。

```shell
gpg --keyserver hkps://keyserver.ubuntu.com:443 --recv-key <YOUR_KEY_ID> # If the following content appears, it means success
gpg: key 02CA7E2CEF04C474: "duansg <duansg@apache.org>" not changed
gpg: Total number processed: 1
gpg:              unchanged: 1
```

或者进入 [https://keyserver.ubuntu.com/](https://keyserver.ubuntu.com/) 网址，输入密钥的名称，然后点击'Search key' 按钮，查看是否有对应名称的密钥。

#### 2.4 将 gpg 公钥添加到 Apache SVN 项目仓库的 KEYS 文件中

- Apache HertzBeat Dev 分支 [https://dist.apache.org/repos/dist/dev/hertzbeat](https://dist.apache.org/repos/dist/dev/hertzbeat)
- Apache HertzBeat Release 分支 [https://dist.apache.org/repos/dist/release/hertzbeat](https://dist.apache.org/repos/dist/release/hertzbeat)

##### 2.4.1 将公钥添加到dev分支的KEYS

切换到 HertzBeat 的根目录进行相关操作：

```shell
$ mkdir -p svn/dev
$ cd svn/dev

$ svn co https://dist.apache.org/repos/dist/dev/hertzbeat
$ cd svn/dev/hertzbeat

# 将生成的KEY追加到KEYS文件中，检查是否添加正确
$ (gpg --list-sigs <YOUR_APACHE_ID>@apache.org && gpg --export --armor <YOUR_APACHE_ID>@apache.org) >> KEYS

$ svn ci -m "add gpg key for <YOUR_APACHE_ID>"
```

##### 2.4.2 将公钥添加到release分支的KEYS

切换到 HertzBeat 的根目录进行相关操作：

```shell
$ mkdir -p svn/release
$ cd svn/release

$ svn co https://dist.apache.org/repos/dist/release/hertzbeat
$ cd svn/release/hertzbeat

# 将生成的KEY追加到KEYS文件中，检查是否添加正确
$ (gpg --list-sigs <YOUR_APACHE_ID>@apache.org && gpg --export --armor <YOUR_APACHE_ID>@apache.org) >> KEYS

$ svn ci -m "add gpg key for <YOUR_APACHE_ID>"
```

## 3. 准备物料 & 发布

### 准备发布物料

#### 3.1 基于 master 分支，创建一个名为 release-`release_version`-rcx 的分支，例如 release-{version}-rc1。并基于 release-{version}-rc1 分支创建一个名为 v{version}-rc1 的标签，并将此标签设置为预发布

```shell
git checkout master
git checkout -b release-{version}-rc1
```

#### 3.2 本地切换到待发布分支

```shell
git checkout release-{version}-rc1
```

#### 3.3 编译二进制包

> HertzBeat 编译打包，在项目`web-app`目录下执行以下命令，

```shell
pnpm install

pnpm package
```

> 在项目根目录下执行以下命令

```shell
mvn clean package -Prelease
```

然后

```shell
mvn clean install
```

> HertzBeat-Collector 编译打包，在项目根目录下执行以下命令

```shell
mvn clean package -pl hertzbeat-collector/hertzbeat-collector-collector -am -Pcluster
```

> 使用带 `native-image` 的 GraalVM JDK 25，为当前宿主机构建 Native 采集器安装包

```shell
mvn clean package -pl hertzbeat-collector/hertzbeat-collector-collector -am -Pnative -DskipTests
```

> 仓库中的 `.github/workflows/collector-native-build.yml` 是 release 辅助工作流，不参与日常 PR 或 push 的常规 CI。
>
> 之所以只保留手动触发，是因为跨平台 Native 构建耗时更长，也会占用相对稀缺的 Linux ARM、macOS 和 Windows Runner。准备发版时，请在 GitHub Actions 页面选择 `Collector Native Release`，基于 release 分支或 tag 手动触发，然后下载上传的产物用于签名和发布。

生成的二进制包在:

- `dist/apache-hertzbeat-{version}-bin.tar.gz`
- `dist/apache-hertzbeat-collector-{version}-bin.tar.gz`
- `dist/apache-hertzbeat-collector-native-{version}-linux-amd64-bin.tar.gz`
- `dist/apache-hertzbeat-collector-native-{version}-linux-arm64-bin.tar.gz`
- `dist/apache-hertzbeat-collector-native-{version}-windows-amd64-bin.zip`
- `dist/apache-hertzbeat-{version}-docker-compose.tar.gz`

> **构建完成后请逐个启动一次 Native 采集器包再进行签名。** Native 包曾出现过构建成功、启动即崩溃的情况，
> 而签名和上传流程都不会发现这一点。解压后执行 `bin/startup.sh`（Windows 为 `bin\startup.bat`），
> 确认日志出现 `Started Collector` 和 `Registered N collect strategies`，且进程在十几秒后仍然存活。

#### 3.4 打包项目源代码

> 打包项目源码

```shell
# 注意替换版本号
git archive \
--format=tar.gz \
--output="dist/apache-hertzbeat-{version}-src.tar.gz" \
--prefix=apache-hertzbeat-{version}-src/ \
release-{version}-rc1
```

生成的代码归档文件在 `dist/apache-hertzbeat-{version}-src.tar.gz`

### 签名发布物料

#### 3.5 对二进制和源码包进行签名

将上步骤生成的三个文件包放到`dist`目录下(若无则新建目录)，然后对文件包进行签名和SHA512校验和生成。

> 其中 `<YOUR_KEY_ID>` 是你的 GPG 短密钥 ID，可以通过 `gpg --keyid-format SHORT --list-keys` 查看。

```shell
cd dist

# 签名，已有签名的物料会跳过
for i in *.tar.gz *.zip; do
  [ -e "$i.asc" ] || { echo "sign: $i"; gpg -u <YOUR_KEY_ID> --armor --output "$i.asc" --detach-sig "$i"; }
done

# SHA512 校验和，已有校验和的物料会跳过
for i in *.tar.gz *.zip; do
  [ -e "$i.sha512" ] || { echo "sha512: $i"; sha512sum "$i" > "$i.sha512"; }
done

# macOS 上若提示 sha512sum 不存在，可通过 brew install coreutils 安装

# 完整性自检：每个物料都必须同时有 .asc 和 .sha512
# 通配符漏掉某类物料时（例如只写 *.tar.gz 会漏掉 Windows 的 .zip），这里会立刻发现
for i in *.tar.gz *.zip; do
  [ -e "$i.asc" ]    || echo "缺少签名: $i"
  [ -e "$i.sha512" ] || echo "缺少校验和: $i"
done
```

> 最终文件列表如下

```text
apache-hertzbeat-{version}-src.tar.gz
apache-hertzbeat-{version}-src.tar.gz.asc
apache-hertzbeat-{version}-src.tar.gz.sha512
apache-hertzbeat-{version}-bin.tar.gz
apache-hertzbeat-{version}-bin.tar.gz.asc
apache-hertzbeat-{version}-bin.tar.gz.sha512
apache-hertzbeat-{version}-docker-compose.tar.gz
apache-hertzbeat-{version}-docker-compose.tar.gz.asc
apache-hertzbeat-{version}-docker-compose.tar.gz.sha512
apache-hertzbeat-collector-{version}-bin.tar.gz
apache-hertzbeat-collector-{version}-bin.tar.gz.asc
apache-hertzbeat-collector-{version}-bin.tar.gz.sha512
apache-hertzbeat-collector-native-{version}-linux-amd64-bin.tar.gz
apache-hertzbeat-collector-native-{version}-linux-amd64-bin.tar.gz.asc
apache-hertzbeat-collector-native-{version}-linux-amd64-bin.tar.gz.sha512
apache-hertzbeat-collector-native-{version}-linux-arm64-bin.tar.gz
apache-hertzbeat-collector-native-{version}-linux-arm64-bin.tar.gz.asc
apache-hertzbeat-collector-native-{version}-linux-arm64-bin.tar.gz.sha512
apache-hertzbeat-collector-native-{version}-windows-amd64-bin.zip
apache-hertzbeat-collector-native-{version}-windows-amd64-bin.zip.asc
apache-hertzbeat-collector-native-{version}-windows-amd64-bin.zip.sha512
```

#### 3.6 验证签名

```shell
$ cd dist

# 验证签名
$ for i in *.tar.gz *.zip; do echo $i; gpg --verify $i.asc $i ; done

apache-hertzbeat-{version}-bin.tar.gz
gpg: Signature made Sun Sep 13 06:59:54 2026 PDT
gpg:                using RSA key C787268D3396367EB3C2242402CA7E2CEF04C474
gpg: Good signature from "duansg <duansg@apache.org>" [ultimate]

apache-hertzbeat-{version}-docker-bin.tar.gz
gpg: Signature made Sun Sep 13 07:00:39 2026 PDT
gpg:                using RSA key C787268D3396367EB3C2242402CA7E2CEF04C474
gpg: Good signature from "duansg <duansg@apache.org>" [ultimate]
apache-hertzbeat-{version}-docker-compose.tar.gz
gpg: Signature made Sun Sep 13 07:00:39 2026 PDT
gpg:                using RSA key C787268D3396367EB3C2242402CA7E2CEF04C474
gpg: Good signature from "duansg <duansg@apache.org>" [ultimate]
apache-hertzbeat-{version}-src.tar.gz
gpg: Signature made Sun Sep 13 07:00:39 2026 PDT
gpg:                using RSA key C787268D3396367EB3C2242402CA7E2CEF04C474
gpg: Good signature from "duansg <duansg@apache.org>" [ultimate]
apache-hertzbeat-collector-{version}-bin.tar.gz
gpg: Signature made Sun Sep 13 07:00:40 2026 PDT
gpg:                using RSA key C787268D3396367EB3C2242402CA7E2CEF04C474
gpg: Good signature from "duansg <duansg@apache.org>" [ultimate]
apache-hertzbeat-collector-native-{version}-linux-amd64-bin.tar.gz
gpg: Signature made Sun Sep 13 07:00:41 2026 PDT
gpg:                using RSA key C787268D3396367EB3C2242402CA7E2CEF04C474
gpg: Good signature from "duansg <duansg@apache.org>" [ultimate]
apache-hertzbeat-collector-native-{version}-linux-arm64-bin.tar.gz
gpg: Signature made Sun Sep 13 07:00:41 2026 PDT
gpg:                using RSA key C787268D3396367EB3C2242402CA7E2CEF04C474
gpg: Good signature from "duansg <duansg@apache.org>" [ultimate]
apache-hertzbeat-collector-native-{version}-windows-amd64-bin.zip
gpg: Signature made Sun Sep 13 18:42:45 2026 PDT
gpg:                using RSA key C787268D3396367EB3C2242402CA7E2CEF04C474
gpg: Good signature from "duansg <duansg@apache.org>" [ultimate]

# 验证 SHA512
$ for i in *.tar.gz *.zip; do echo $i; sha512sum --check $i.sha512; done

apache-hertzbeat-{version}-bin.tar.gz
apache-hertzbeat-{version}-bin.tar.gz: OK
apache-hertzbeat-{version}-docker-bin.tar.gz
apache-hertzbeat-{version}-docker-bin.tar.gz: OK
apache-hertzbeat-{version}-docker-compose.tar.gz
apache-hertzbeat-{version}-docker-compose.tar.gz: OK
apache-hertzbeat-{version}-src.tar.gz
apache-hertzbeat-{version}-src.tar.gz: OK
apache-hertzbeat-collector-{version}-bin.tar.gz
apache-hertzbeat-collector-{version}-bin.tar.gz: OK
apache-hertzbeat-collector-native-{version}-linux-amd64-bin.tar.gz
apache-hertzbeat-collector-native-{version}-linux-amd64-bin.tar.gz: OK
apache-hertzbeat-collector-native-{version}-linux-arm64-bin.tar.gz
apache-hertzbeat-collector-native-{version}-linux-arm64-bin.tar.gz: OK
apache-hertzbeat-collector-native-{version}-windows-amd64-bin.zip
apache-hertzbeat-collector-native-{version}-windows-amd64-bin.zip: OK
```

#### 3.7 发布 Apache SVN 仓库中 dev 目录的物料包

- 检出仓库

```shell
# 检出 Apache SVN 仓库中的 dev/hertzbeat 目录到 Apache HertzBeat™ 项目根目录下的 svn/dev 目录下
svn co https://dist.apache.org/repos/dist/dev/hertzbeat svn/dev

# 历史候选版本较多时，可改用空检出，避免下载全部历史物料
# svn co --depth empty https://dist.apache.org/repos/dist/dev/hertzbeat svn/dev
```

- 复制物料包到 SVN 仓库

创建一个版本号目录，并以`release_version`-`RC_version`的形式命名。RC_version从1开始，即候选版本从RC1开始。在发布过程中，如果出现导致投票失败的问题，需要进行修正，那么RC版本需要迭代，RC版本号需要+1。例如：为版本{version}-RC1投票。如果投票顺利通过，那么RC1版本的资料将作为最终版本的资料发布。如果出现问题并需要纠正，那么修正后重新启动投票，下一次的候选版本为{version}-RC2。

```shell
mkdir -p svn/dev/{version}-RC1
cp -f dist/* svn/dev/{version}-RC1
```

- 提交到SVN

```shell
cd svn/dev

# 1. 检查svn状态
svn status

# 2. 添加到svn
svn add {version}-RC1

svn status

# 3. 提交到svn远端服务器
svn commit -m "release for HertzBeat {version}-RC1"
```

- 检查 Apache SVN 提交结果

> 在浏览器中访问 [https://dist.apache.org/repos/dist/dev/hertzbeat/](https://dist.apache.org/repos/dist/dev/hertzbeat/) , 检查是否有新的版本内容

## 4. 进入社区投票阶段

### 4.1 发送社区投票邮件

发送社区投票邮件需要至少三个`+1`，且无`-1`。

:::caution 发信前先确认两件事
1. **你的公钥已经在 KEYS 文件里**：访问 [https://downloads.apache.org/hertzbeat/KEYS](https://downloads.apache.org/hertzbeat/KEYS) 搜索自己的邮箱，找不到则投票者无法验证签名。KEYS 的添加见 2.4。
2. **模板里的版本号和 RC 号已全部替换**：下面的模板共有 **5 处**需要改动——邮件标题、正文第一行、Release notes 链接、候选物料链接、Git tag 链接。RC 号递增时（RC1 → RC2）这几处必须同步修改，漏改任何一处都会让投票者困惑。
:::

> `Send to`: [dev@hertzbeat.apache.org](mailto:dev@hertzbeat.apache.org) <br />
> `Title`: [VOTE] Release Apache HertzBeat {version} rc1 <br />
> `Body`:

```text
Hello HertzBeat Community:

This is a call for vote to release Apache HertzBeat version release-{version}-RC1.

Apache HertzBeat - a real-time observability system with agentless, performance cluster, prometheus-compatible, custom monitoring and status page building capabilities.

Release notes:
https://github.com/apache/hertzbeat/releases/tag/v{version}-rc1

The release candidates:
https://dist.apache.org/repos/dist/dev/hertzbeat/{version}-RC1/

Git tag for the release:
https://github.com/apache/hertzbeat/releases/tag/v{version}-rc1

The artifacts signed with PGP key [<YOUR_KEY_ID>], corresponding to [<YOUR_APACHE_ID>@apache.org], that can be found in keys file:
https://downloads.apache.org/hertzbeat/KEYS

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

Steps to validate the release，Please refer to:
https://hertzbeat.apache.org/docs/community/how_to_verify_release

How to Build:
https://hertzbeat.apache.org/docs/community/development/#build-hertzbeat-binary-package

Thanks!
```

在72小时后，将统计投票结果，并发送投票结果邮件，如下所示。

> `Send to`: [dev@hertzbeat.apache.org](mailto:dev@hertzbeat.apache.org) <br />
> `Title`: [RESULT]\[VOTE\] Release Apache HertzBeat {version}-rc1 <br />
> `Body`:

```text
Dear HertzBeat community,

Thanks for your review and vote for "Release Apache HertzBeat {version}-rc1"
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
Thank you to everyone who helped us to verify and vote for this release.
---
Best,
<YOUR_NAME>
```

邮件内容中的一项是`Vote thread`，在 [https://lists.apache.org/list.html?dev@hertzbeat.apache.org](https://lists.apache.org/list.html?dev@hertzbeat.apache.org) 查看获取

## 5. 完成最终发布步骤

### 5.1 迁移源代码和二进制包

```shell
svn mv https://dist.apache.org/repos/dist/dev/hertzbeat/{version}-RC1 https://dist.apache.org/repos/dist/release/hertzbeat/{version}  -m "transfer packages for {version}-RC1"
```

### 5.2 添加新版本下载地址到官网

[https://github.com/apache/hertzbeat/blob/master/home/docs/download.md](https://github.com/apache/hertzbeat/blob/master/home/docs/download.md)
[https://github.com/apache/hertzbeat/blob/master/home/i18n/zh-cn/docusaurus-plugin-content-docs/current/download.md](https://github.com/apache/hertzbeat/blob/master/home/i18n/zh-cn/docusaurus-plugin-content-docs/current/download.md)

完成后打开官网地址 [https://hertzbeat.apache.org/docs/download/](https://hertzbeat.apache.org/docs/download/) 查看是否有新版本的下载

> 需要注意的是，下载链接可能需要一个小时后才会生效，请注意。

### 5.3 Github 生成 Release

基于 release-{version}-rc1 分支修改创建一个名为 v{version} 的标签，并将此标签设置为 latest release。

:::tip
在原有的 Release 上面修改，无需重新创建 Release。
:::

然后输入发版标题和描述

- 发版标题:

```text
v{version}
```

- 描述:

```text
xxx
release note: xxx
```

然后点击`Publish release`按钮。

然后将 release-{version}-rc1 分支重命名 为 release-{version}。

### 5.4 发送新版本公告邮件

> `Send to`: [announce@apache.org](mailto:announce@apache.org) <br />
> `cc`: [dev@hertzbeat.apache.org](mailto:dev@hertzbeat.apache.org) <br />
> `Title`: [ANNOUNCE] Apache HertzBeat {version} released <br />
> `Body`:

```text
Hi Community,

We are glad to announce the release of Apache HertzBeat {version}.
Thanks again for your help.

Apache HertzBeat (https://hertzbeat.apache.org/) - a real-time observability system with agentless, performance cluster, prometheus-compatible, custom monitoring and status page building capabilities.

Download Link:
https://hertzbeat.apache.org/docs/download/

Release Note:
https://github.com/apache/hertzbeat/releases/tag/v{version}

Website:
https://hertzbeat.apache.org/

HertzBeat Resources:
- Issue: https://github.com/apache/hertzbeat/issues
- Mailing list: dev@hertzbeat.apache.org
---
Apache HertzBeat Team

Best,
<YOUR_NAME>
```

该版本的发布顺利结束。

---
