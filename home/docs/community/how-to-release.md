---
id: 'how_to_release'
title: How to Release
sidebar_position: 4
---

This tutorial describes in detail how to release Apache HertzBeat™.

:::caution Before you start: placeholders used in this document
The commands and mail templates below use placeholders. Replace every one of them with your own
values before running anything — **do not copy and paste as is**.

| Placeholder | Meaning | Example |
| --- | --- | --- |
| `{version}` | Release version | `1.9.0` |
| `RC1` | Release candidate number, starts at 1 and goes up on every re-vote | `RC2` |
| `<YOUR_APACHE_ID>` | Your Apache LDAP user name | `duansg` |
| `<YOUR_APACHE_ID>@apache.org` | Your Apache mail address | `duansg@apache.org` |
| `<YOUR_KEY_ID>` | Your short GPG key ID, from `gpg --keyid-format SHORT --list-keys` | `EF04C474` |
| `<YOUR_NAME>` | The name you sign mails with | `Duan SiGuo` |

Command **output** samples in this document keep concrete values so you can compare the shape of
the output; what you see will contain your own key and address.
:::

## 1. Environmental requirements

This release process is operated in the UbuntuOS(Windows,Mac), and the following tools are required:

- JDK 25
- Node18 pnpm
- Apache Maven 3.x
- GnuPG 2.x
- Git
- SVN (apache uses svn to host project releases)

> Pay attention to setting environment variables `export GPG_TTY=$(tty)`

## 2. Preparing for release

> First summarize the account information to better understand the operation process, will be used many times later.
>
> - apache id: `<YOUR_APACHE_ID>` (APACHE LDAP UserName)
> - apache passphrase: `APACHE LDAP Passphrase`
> - apache email: `<YOUR_APACHE_ID>@apache.org`
> - gpg real name: `<YOUR_APACHE_ID>` (Any name can be used, using the same name as the apache id is recommended)
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
    "muchunjin (apache key) [muchunjin@apache.org](mailto:muchunjin@apache.org)"

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
gpg: key ACFB69E705016886 marked as ultimately trusted
gpg: revocation certificate stored as '/root/.gnupg/openpgp-revocs.d/DC12398CCC33A5349EB9663DF9D970AB18C9EDF6.rev'
public and secret key created and signed.

pub   rsa4096 2023-05-01 [SC]
      85778A4CE4DD04B7E07813ABACFB69E705016886
uid                      muchunjin (apache key) [muchunjin@apache.org](mailto:muchunjin@apache.org)
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
uid         [ultimate] muchunjin (apache key) [muchunjin@apache.org](mailto:muchunjin@apache.org)
sub   rsa4096/0C5A4E1C 2023-05-01 [E]

# Send public key to keyserver via key id
$ gpg --keyserver hkps://keyserver.ubuntu.com:443 --send-key <YOUR_KEY_ID>
# Among them, keyserver.ubuntu.com is the selected keyserver, it is recommended to use this, because the Apache Nexus verification uses this keyserver
```

#### 2.3 Check if the key is created successfully

Verify whether it is synchronized to the public network, it will take about a minute to find out the answer, if not successful, you can upload and retry multiple times.

```shell
$ gpg --keyserver hkps://keyserver.ubuntu.com:443 --recv-key <YOUR_KEY_ID>   # If the following content appears, it means success
gpg: key ACFB69E705016886: "muchunjin (apache key) [muchunjin@apache.org](mailto:muchunjin@apache.org)" not changed
gpg: Total number processed: 1
gpg:              unchanged: 1
```

Or enter [https://keyserver.ubuntu.com/](https://keyserver.ubuntu.com/) address in the browser, enter the name of the key and click 'Search key' to search if existed.

#### 2.4 Add the gpg public key to the KEYS file of the Apache SVN project repo

- Apache HertzBeat™ Branch Dev [https://dist.apache.org/repos/dist/dev/hertzbeat](https://dist.apache.org/repos/dist/dev/hertzbeat)
- Apache HertzBeat™ Branch Release [https://dist.apache.org/repos/dist/release/hertzbeat](https://dist.apache.org/repos/dist/release/hertzbeat)

##### 2.4.1 Add public key to KEYS in dev branch

```shell
$ mkdir -p svn/dev
$ cd svn/dev

$ svn co https://dist.apache.org/repos/dist/dev/hertzbeat
$ cd svn/dev/hertzbeat

# Append the KEY you generated to the file KEYS, and check if it is added correctly
$ (gpg --list-sigs <YOUR_APACHE_ID>@apache.org && gpg --export --armor <YOUR_APACHE_ID>@apache.org) >> KEYS

$ svn ci -m "add gpg key for <YOUR_APACHE_ID>"
```

##### 2.4.2 Add public key to KEYS in release branch

```shell
$ mkdir -p svn/release
$ cd svn/release

$ svn co https://dist.apache.org/repos/dist/release/hertzbeat
$ cd svn/release/hertzbeat

# Append the KEY you generated to the file KEYS, and check if it is added correctly
$ (gpg --list-sigs <YOUR_APACHE_ID>@apache.org && gpg --export --armor <YOUR_APACHE_ID>@apache.org) >> KEYS

$ svn ci -m "add gpg key for <YOUR_APACHE_ID>"
```

## 3. Prepare material package & release

### Build Package

#### 3.1 Based on the master branch, create a release-`release_version`-rcx branch, such as release-1.7.3-rc1, And create a tag named v1.7.3-rc1 based on the release-1.7.3-rc1 branch, and set this tag as pre-release

```shell
git checkout master
git checkout -b release-1.7.3-rc1
```

#### 3.2 checkout release branch to local

```shell
git checkout release-1.7.3-rc1
```

#### 3.3 Compile the binary package

> Build HertzBeat server binary, run script in `web-app`

```shell
pnpm install

pnpm package
```

> run script in root

```shell
mvn clean package -Prelease
```

then

```shell
mvn clean install
```

> Build HertzBeat collector binary, run script in the project root directory

```shell
mvn clean package -pl hertzbeat-collector/hertzbeat-collector-collector -am -Pcluster
```

> Build the native collector binary for the current host with GraalVM JDK 25 and `native-image`

```shell
mvn clean package -pl hertzbeat-collector/hertzbeat-collector-collector -am -Pnative -DskipTests
```

> The repository workflow `.github/workflows/collector-native-build.yml` is a release helper, not a regular PR or push CI workflow.
>
> It is intentionally manual-only because multi-platform native builds are relatively slow and consume scarce Linux ARM, macOS, and Windows runners. During release preparation, open the Actions page, select `Collector Native Release`, run it from the release branch or tag, and then download the uploaded artifacts for signing and publishing.

The release package are here:

- `dist/apache-hertzbeat-{version}-bin.tar.gz`
- `dist/apache-hertzbeat-collector-{version}-bin.tar.gz`
- `dist/apache-hertzbeat-collector-native-{version}-linux-amd64-bin.tar.gz`
- `dist/apache-hertzbeat-collector-native-{version}-linux-arm64-bin.tar.gz`
- `dist/apache-hertzbeat-collector-native-{version}-windows-amd64-bin.zip`
- `dist/apache-hertzbeat-{version}-docker-compose.tar.gz`

> **Start each native collector package once before signing it.** A native package has shipped
> green from the build while crashing immediately on startup, and neither signing nor uploading
> catches that. Unpack it, run `bin/startup.sh` (`bin\startup.bat` on Windows), and confirm the log
> shows `Started Collector` and `Registered N collect strategies`, and that the process is still
> alive ten seconds later.

#### 3.4 Package the source code

> Package the project source code

```shell
git archive \
--format=tar.gz \
--output="dist/apache-hertzbeat-1.7.3-src.tar.gz" \
--prefix=apache-hertzbeat-1.7.3-src/ \
release-1.7.3-rc1
```

The archive package is here `dist/apache-hertzbeat-1.7.3-src.tar.gz`

### Sign package

#### 3.5 Sign binary and source packages

> `<YOUR_KEY_ID>` is your short gpg key ID, see from `gpg --keyid-format SHORT --list-keys`

```shell
cd dist

# sign, skipping artifacts that already have a signature
for i in *.tar.gz *.zip; do
  [ -e "$i.asc" ] || { echo "sign: $i"; gpg -u <YOUR_KEY_ID> --armor --output "$i.asc" --detach-sig "$i"; }
done

# SHA512 checksums, skipping artifacts that already have one
for i in *.tar.gz *.zip; do
  [ -e "$i.sha512" ] || { echo "sha512: $i"; sha512sum "$i" > "$i.sha512"; }
done

# if macos sha512sum not found, you can install by brew install coreutils

# integrity check: every artifact must have both .asc and .sha512
# this catches artifacts a glob missed, e.g. *.tar.gz alone skips the Windows .zip
for i in *.tar.gz *.zip; do
  [ -e "$i.asc" ]    || echo "MISSING SIGNATURE: $i"
  [ -e "$i.sha512" ] || echo "MISSING CHECKSUM:  $i"
done
```

> The final file list is as follows

```text
apache-hertzbeat-1.7.3-src.tar.gz
apache-hertzbeat-1.7.3-src.tar.gz.asc
apache-hertzbeat-1.7.3-src.tar.gz.sha512
apache-hertzbeat-1.7.3-bin.tar.gz
apache-hertzbeat-1.7.3-bin.tar.gz.asc
apache-hertzbeat-1.7.3-bin.tar.gz.sha512
apache-hertzbeat-1.7.3-docker-compose.tar.gz
apache-hertzbeat-1.7.3-docker-compose.tar.gz.asc
apache-hertzbeat-1.7.3-docker-compose.tar.gz.sha512
apache-hertzbeat-collector-1.7.3-bin.tar.gz
apache-hertzbeat-collector-1.7.3-bin.tar.gz.asc
apache-hertzbeat-collector-1.7.3-bin.tar.gz.sha512
apache-hertzbeat-collector-native-1.9.0-linux-amd64-bin.tar.gz
apache-hertzbeat-collector-native-1.9.0-linux-amd64-bin.tar.gz.asc
apache-hertzbeat-collector-native-1.9.0-linux-amd64-bin.tar.gz.sha512
apache-hertzbeat-collector-native-1.9.0-linux-arm64-bin.tar.gz
apache-hertzbeat-collector-native-1.9.0-linux-arm64-bin.tar.gz.asc
apache-hertzbeat-collector-native-1.9.0-linux-arm64-bin.tar.gz.sha512
apache-hertzbeat-collector-native-1.9.0-windows-amd64-bin.zip
apache-hertzbeat-collector-native-1.9.0-windows-amd64-bin.zip.asc
apache-hertzbeat-collector-native-1.9.0-windows-amd64-bin.zip.sha512
```

#### 3.6 Verify signature

```shell
$ cd dist

# Verify signature
$ for i in *.tar.gz; do echo $i; gpg --verify $i.asc $i ; done

apache-hertzbeat-1.7.3-bin.tar.gz
gpg: Signature made Tue May  2 12:16:35 2023 CST
gpg:                using RSA key 85778A4CE4DD04B7E07813ABACFB69E705016886
gpg: Good signature from "muchunjin (apache key) [muchunjin@apache.org](mailto:muchunjin@apache.org)" [ultimate]
apache-hertzbeat-1.7.3-docker-compose.tar.gz
gpg: Signature made Tue May  2 12:16:36 2023 CST
gpg:                using RSA key 85778A4CE4DD04B7E07813ABACFB69E705016886
gpg: Good signature from "muchunjin (apache key) [muchunjin@apache.org](mailto:muchunjin@apache.org)" [ultimate]
apache-hertzbeat-1.7.3-src.tar.gz
gpg: Signature made Tue May  2 12:16:37 2023 CST
gpg:                using RSA key 85778A4CE4DD04B7E07813ABACFB69E705016886
gpg: Good signature from "muchunjin (apache key) [muchunjin@apache.org](mailto:muchunjin@apache.org)" [ultimate]
apache-hertzbeat-collector-1.7.3-bin.tar.gz
gpg: Signature made Tue May  2 12:16:37 2023 CST
gpg:                using RSA key 85778A4CE4DD04B7E07813ABACFB69E705016886
gpg: Good signature from "muchunjin (apache key) [muchunjin@apache.org](mailto:muchunjin@apache.org)" [ultimate]

# Verify SHA512
$ for i in *.tar.gz; do echo $i; sha512sum --check $i.sha512; done

apache-hertzbeat-1.7.3-src.tar.gz
apache-hertzbeat-1.7.3-src.tar.gz: OK
apache-hertzbeat-1.7.3-bin.tar.gz
apache-hertzbeat-1.7.3-bin.tar.gz: OK
apache-hertzbeat-1.7.3-docker-compose.tar.gz
apache-hertzbeat-1.7.3-docker-compose.tar.gz: OK
apache-hertzbeat-collector-1.7.3-bin.tar.gz
apache-hertzbeat-collector-1.7.3-bin.tar.gz: OK
```

#### 3.7 Publish the dev directory of the Apache SVN material package

- Clone the dev directory

```shell
# Check out the dev directory of the Apache SVN to the svn/dev directory under dist in the root directory of the Apache HertzBeat™ project
svn co https://dist.apache.org/repos/dist/dev/hertzbeat svn/dev

# alternative: check out an empty working copy when you do not want to download
# every past release candidate
# svn co --depth empty https://dist.apache.org/repos/dist/dev/hertzbeat svn/dev
```

- Copy the material package to the dev directory

Create a version number directory and name it in the form of `release_version`-`RC_version`. RC_version starts from 1, that is, the candidate version starts from RC1. During the release process, there is a problem that causes the vote to fail.
If it needs to be corrected, it needs to iterate the RC version , the RC version number needs to be +1. For example: Vote for version 1.7.3-RC1. If the vote passes without any problems, the RC1 version material will be released as the final version material.
If there is a problem (when the HertzBeat community votes, the voters will strictly check various release requirements and compliance issues) and need to be corrected, then re-initiate the vote after the correction, and the candidate version for the next vote is 1.7.3- RC2.

```shell
mkdir -p svn/dev/1.7.3-RC1
cp -f dist/* svn/dev/1.7.3-RC1
```

- Commit to SVN

```shell
cd svn/dev

# 1.check svn status
svn status

# 2. add to svn
svn add 1.7.3-RC1

svn status

# 3. Submit to svn remote server
svn commit -m "release for HertzBeat 1.7.3"
```

- Check Apache SVN Commit Results

> Visit the address [https://dist.apache.org/repos/dist/dev/hertzbeat/](https://dist.apache.org/repos/dist/dev/hertzbeat/) in the browser, check if existed the new material package

## 4. Enter the community voting stage

### 4.1 Send a Community Vote Email

Send a voting email in the community requires at least three `+1` and no `-1`.

:::caution Check two things before sending

1. **Your public key is already in the KEYS file.** Open [https://downloads.apache.org/hertzbeat/KEYS](https://downloads.apache.org/hertzbeat/KEYS) and search for your address. If it is not there, voters cannot verify your signatures. See 2.4 for how to add it.
2. **Every version and RC number in the template is replaced.** The template below has **five** places to change: the mail subject, the first line of the body, the release notes link, the release candidates link and the git tag link. When the RC number goes up (RC1 to RC2) all five have to move together; missing one confuses the voters.
:::

> `Send to`: [dev@hertzbeat.apache.org](mailto:dev@hertzbeat.apache.org) <br />
> `Title`: [VOTE] Release Apache HertzBeat™ 1.7.3 rc1 <br />
> `Body`:

```text
Hello HertzBeat Community:

This is a call for vote to release Apache HertzBeat™ version release-1.7.3-RC1.

Apache HertzBeat™ - A real-time observability system with agentless, performance cluster, prometheus-compatible, custom monitoring and status page building capabilities.

Release notes:
https://github.com/apache/hertzbeat/releases/tag/v1.7.3-rc1

The release candidates:
https://dist.apache.org/repos/dist/dev/hertzbeat/1.7.3-RC1/

Git tag for the release:
https://github.com/apache/hertzbeat/releases/tag/v1.7.3-rc1

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

After 72 hours, the voting results will be counted, and the voting result email will be sent, as follows.

> `Send to`: [dev@hertzbeat.apache.org](mailto:dev@hertzbeat.apache.org) <br />
> `Title`: [RESULT]\[VOTE\] Release Apache HertzBeat™ 1.7.3-rc1 <br />
> `Body`:

```text
Dear HertzBeat community,

Thanks for your review and vote for "Release Apache HertzBeat™ 1.7.3-rc1"
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
<YOUR_NAME>
```

One item of the email content is `Vote thread`, and the link is obtained here: [https://lists.apache.org/list.html?dev@hertzbeat.apache.org](https://lists.apache.org/list.html?dev@hertzbeat.apache.org)

## 5. Complete the final publishing steps

### 5.1 Migrating source and binary packages

```shell
svn mv https://dist.apache.org/repos/dist/dev/hertzbeat/1.7.3-RC1 https://dist.apache.org/repos/dist/release/hertzbeat/1.7.3  -m "transfer packages for 1.7.3-RC1"
```

#### 5.2 Add the new version download address to the official website

[https://github.com/apache/hertzbeat/blob/master/home/docs/download.md](https://github.com/apache/hertzbeat/blob/master/home/docs/download.md)
[https://github.com/apache/hertzbeat/blob/master/home/i18n/zh-cn/docusaurus-plugin-content-docs/current/download.md](https://github.com/apache/hertzbeat/blob/master/home/i18n/zh-cn/docusaurus-plugin-content-docs/current/download.md)

Open the official website address [https://hertzbeat.apache.org/docs/download/](https://hertzbeat.apache.org/docs/download/) to see if there is a new version of the download

> It should be noted that the download link may take effect after an hour, so please pay attention to it.

#### 5.3 Cut the documentation version for the website

The website serves the latest release at `/docs` and `master` at `/docs/next`. Snapshot the docs as a new version:

```shell
cd home
pnpm install
pnpm run docusaurus docs:version {version}   # plain ASCII: a full-width comma breaks routing
```

That covers `docs/` and `zh-cn`. Finish the rest by hand:

- create `i18n/en/...-content-docs/version-{version}.json` and the `ko` one from each `current.json`; locales without a `current/` directory are skipped
- set `version.label` to `{version}` in all three `version-{version}.json`, otherwise the version dropdown shows `dev`
- point `lastVersion` at `{version}` in `docusaurus.config.js`

Then verify and build:

```shell
diff -rq docs versioned_docs/version-{version}
pnpm run md-lint && pnpm run build
```

Commit the snapshot on its own; it is several hundred files and stops being reviewable once mixed with other changes. After it is merged, the `DOC Deploy` workflow publishes the site to the `asf-site` branch.

#### 5.4 Generate a release on github

Update pre-release to create a tag named v1.7.3 based on the release-1.7.3-rc1 branch, and set this tag to latest release.

:::tip
You can modify it on the original RC Release without creating a new Release.
:::

Then enter Release Title and Describe

- Release Title:

```text
v1.7.3
```

- Describe:

```text
xxx
release note: xxx
```

Then click the `Publish release` button.

The rename the release-1.7.3-rc1 branch to release-1.7.3.

#### 5.5 Send new version announcement email

> `Send to`: [announce@apache.org](mailto:announce@apache.org) <br />
> `cc`: [dev@hertzbeat.apache.org](mailto:dev@hertzbeat.apache.org) <br />
> `Title`: [ANNOUNCE] Apache HertzBeat™ 1.7.3 released <br />
> `Body`:

```text
Hi Community,

We are glad to announce the release of Apache HertzBeat™ 1.7.3.
Thanks again for your help.

Apache HertzBeat™ (https://hertzbeat.apache.org/) - A real-time observability system with agentless, performance cluster, prometheus-compatible, custom monitoring and status page building capabilities.

Download Link:
https://hertzbeat.apache.org/docs/download/

Release Note:
https://github.com/apache/hertzbeat/releases/tag/v1.7.3

Website:
https://hertzbeat.apache.org/

HertzBeat Resources:
- Issue: https://github.com/apache/hertzbeat/issues
- Mailing list: dev@hertzbeat.apache.org
---
Apache HertzBeat™ Team
---
Best,
<YOUR_NAME>
```

This version release is over.

---
