---
id: 'how_to_release'
title: How to Release
sidebar_position: 4
---

This tutorial describes in detail how to release Apache HertzBeat, take the release of version 2.1.0 as an example.

## 1. Environmental requirements

This release process is operated in the Ubuntu OS, and the following tools are required:

- JDK 1.8+
- Apache Maven 3.x (this process uses 3.8.7)
- GnuPG 2.x
- Git
- SVN (apache uses svn to host project releases)

> Pay attention to setting environment variables `export GPG_TTY=$(tty)`

## 2. Preparing for release

> First summarize the account information to better understand the operation process, will be used many times later.
- apache id: `muchunjin (APACHE LDAP UserName)`
- apache passphrase: `APACHE LDAP Passphrase`
- apache email: `muchunjin@apache.org`
- gpg real name: `muchunjin (Any name can be used, here I set it to the same name as the apache id)`
- gpg key passphrase: `The password set when creating the gpg key, you need to remember this password`

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

Keys can be viewed through the `gpg --list-signatures` command

### 2.2 Upload the generated key to the public server

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

#### 2.3 Check if the key is created successfully

Verify whether it is synchronized to the public network, it will take about a minute to find out the answer, if not successful, you can upload and retry multiple times.

```shell
$ gpg --keyserver keyserver.ubuntu.com --recv-keys 05016886   # If the following content appears, it means success
gpg: key ACFB69E705016886: "muchunjin (for apache HertzBeat release create at 20230501) <muchunjin@apache.org>" not changed
gpg: Total number processed: 1
gpg:              unchanged: 1
```

Or enter https://keyserver.ubuntu.com/ address in the browser, enter the name of the key and click 'Search key'

![图片](https://github.com/apache/incubator-hertzbeat/assets/19602424/b8fe193e-c137-42b0-a833-90a6d975f335)

If the query results are as follows, it means that the key is successfully created.

![图片](https://github.com/apache/incubator-hertzbeat/assets/19602424/73ada3f2-2d2e-4b76-b25c-34a52db6a069)

#### 2.4 Add the gpg public key to the KEYS file of the Apache SVN project warehouse

- Apache HertzBeat Branch Dev https://dist.apache.org/repos/dist/dev/incubator/hertzbeat
- Apache HertzBeat Branch Release https://dist.apache.org/repos/dist/release/incubator/hertzbeat/

##### 2.4.1 Add public key to KEYS in dev branch

```shell
$ mkdir -p hertzbeat/dev
$ cd hertzbeat_svn/dev

$ svn co https://dist.apache.org/repos/dist/dev/incubator/hertzbeat
$ cd hertzbeat_svn/dev/hertzbeat

# Append the KEY you generated to the file KEYS, and check if it is added correctly
$ (gpg --list-sigs muchunjin@apache.org && gpg --export --armor muchunjin@apache.org) >> KEYS 

$ svn ci -m "add gpg key for muchunjin"
```

##### 2.4.2 Add public key to KEYS in release branch

```shell
$ mkdir -p hertzbeat_svn/release
$ cd hertzbeat_svn/release

$ svn co https://dist.apache.org/repos/dist/release/incubator/hertzbeat/
$ cd hertzbeat_svn/release/hertzbeat

# Append the KEY you generated to the file KEYS, and check if it is added correctly
$ (gpg --list-sigs muchunjin@apache.org && gpg --export --armor muchunjin@apache.org) >> KEYS 

$ svn ci -m "add gpg key for muchunjin"
```

#### 2.5 Configure apache maven address and user password settings

- Generate master password
```shell
$ mvn --encrypt-master-password <apache password>
{EM+4/TYVDXYHRbkwjjAS3mE1RhRJXJUSG8aIO5RSxuHU26rKCjuS2vG+/wMjz9te}
```

- Create the file ${user.home}/.m2/settings-security.xml and configure the password created in the previous step

```shell
<settingsSecurity>
  <master>{EM+4/TYVDXYHRbkwjjAS3mE1RhRJXJUSG8aIO5RSxuHU26rKCjuS2vG+/wMjz9te}</master>
</settingsSecurity>
```

- Generate the final encrypted password and add it to the ~/.m2/settings.xml file

```shell
$ mvn --encrypt-password <apache passphrase>
{/ZLaH78TWboH5IRqNv9pgU4uamuqm9fCIbw0gRWT01c=}
```

> In the maven configuration file ~/.m2/settings.xml, add the following `server` item

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
        <!-- APACHE LDAP password (Fill in the password you just created with the command `mvn --encrypt-password <apache passphrase>`) -->
        <password>{/ZLaH78TWboH5IRqNv9pgU4uamuqm9fCIbw0gRWT01c=}</password>
    </server>
    <server>
        <id>apache.releases.https</id>
        <!-- APACHE LDAP UserName --> 
        <username>muchunjin</username>
        <!-- APACHE LDAP password (Fill in the password you just created with the command `mvn --encrypt-password <apache passphrase>`) -->
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

## 3. Prepare material package & release Apache Nexus

#### 3.1 Based on the dev branch, create a release-${release_version}-rcx branch, such as release-2.1.0-rc1, And create a tag named v2.1.0-rc1 based on the release-2.1.0-rc1 branch, and set this tag as pre-release.

![图片](https://user-images.githubusercontent.com/19602424/236656362-1d346faa-6582-44eb-9722-8bb2de0eaa92.png)

#### 3.2 clone release branch to local

```shell
git clone -b release-2.1.0-rc1 -c core.autocrlf=false git@github.com:apache/incubator-hertzbeat.git
```

#### 3.3 Publish the relevant JARs to Apache Nexus

##### 3.3.1 Release scala 2.11 to the Apache Nexus repository

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

##### 3.3.2 Release scala 2.12 to the Apache Nexus repository

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

##### 3.3.3 Check for successful publishing to the Apache Nexus repository

> Visit https://repository.apache.org/ and log in, if there are scala 2.11, scala 2.12, it means success.

![图片](https://user-images.githubusercontent.com/19602424/236657233-08d142eb-5f81-427b-a04d-9ab3172199c1.png)

#### 3.4 Compile the binary package

> Scala 2.11 compilation and packaging

```shell
> ./build.sh # choose "mixed mode" and "scala 2.11"
```

> Scala 2.12 compilation and packaging

```shell
> ./build.sh # choose "mixed mode" and "scala 2.12"
```

> Package the project source code

```shell
git archive \
--format=tar.gz \
--output="dist/apache-hertzbeat-2.1.0-incubating-src.tar.gz" \
--prefix=apache-hertzbeat-2.1.0-incubating-src/ \
release-2.1.0-rc1
```

> The following 3 files will be generated

```
apache-hertzbeat-2.1.0-incubating-src.tar.gz
apache-hertzbeat_2.11-2.1.0-incubating-bin.tar.gz
apache-hertzbeat_2.12-2.1.0-incubating-bin.tar.gz
```

#### 3.4 Sign binary and source packages

```shell
cd dist

# sign
for i in *.tar.gz; do echo $i; gpg --armor --output $i.asc --detach-sig $i ; done

# SHA512
for i in *.tar.gz; do echo $i; sha512sum $i > $i.sha512 ; done
```

> The final file list is as follows

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

#### 3.5 Verify signature

```shell
$ cd dist

# Verify signature
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

# Verify SHA512
$ for i in *.tar.gz; do echo $i; sha512sum --check $i.sha512; done

apache-hertzbeat-2.1.0-incubating-src.tar.gz
apache-hertzbeat-2.1.0-incubating-src.tar.gz: OK
apache-hertzbeat_2.11-2.1.0-incubating-bin.tar.gz
apache-hertzbeat_2.11-2.1.0-incubating-bin.tar.gz: OK
apache-hertzbeat_2.12-2.1.0-incubating-bin.tar.gz
apache-hertzbeat_2.12-2.1.0-incubating-bin.tar.gz: OK
```

#### 3.6 Publish the dev directory of the Apache SVN warehouse of the material package

```shell
# Check out the dev directory of the Apache SVN warehouse to the hertzbeat_svn_dev directory under dist in the root directory of the Apache HertzBeat project
svn co https://dist.apache.org/repos/dist/dev/incubator/hertzbeat dist/hertzbeat_svn_dev

svn co --depth empty https://dist.apache.org/repos/dist/dev/incubator/hertzbeat
```

Create a version number directory and name it in the form of ${release_version}-${RC_version}. RC_version starts from 1, that is, the candidate version starts from RC1. During the release process, there is a problem that causes the vote to fail. If it needs to be corrected, it needs to iterate the RC version , the RC version number needs to be +1. For example: Vote for version 2.1.0-RC1. If the vote passes without any problems, the RC1 version material will be released as the final version material. If there is a problem (when the hertzbeat/incubator community votes, the voters will strictly check various release requirements and compliance issues) and need to be corrected, then re-initiate the vote after the correction, and the candidate version for the next vote is 2.1.0- RC2.

```shell
mkdir -p dist/hertzbeat_svn_dev/2.1.0-RC1
cp -f dist/* dist/hertzbeat_svn_dev/2.1.0-RC1
```

Commit to SVN

```shell
cd dist/hertzbeat_svn_dev/

# 1.check svn status
svn status

# 2. add to svn
svn add 2.0.0-RC1

svn status

# 3. Submit to svn remote server
svn commit -m "release for HertzBeat 2.1.0"
```

#### 3.7 Check Apache SVN Commit Results

> Visit the address https://dist.apache.org/repos/dist/dev/incubator/hertzbeat/2.1.0-RC1/ in the browser

![图片](https://github.com/apache/incubator-hertzbeat/assets/19602424/e4763537-af9f-4f2a-967d-912e6670b360)

## 3. Enter the community voting stage

#### 3.1 Send a Community Vote Email

Send a voting email in the community requires at least three `+1` and no `-1`.

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
https://github.com/apache/incubator-hertzbeat/releases/tag/v2.1.0-rc1

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

1.cd incubator-hertzbeat
2.sh ./build.sh

Thanks!
```

After 72 hours, the voting results will be counted, and the voting result email will be sent, as follows.

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

One item of the email content is `Vote thread`, and the link is obtained as follows: <br />
Visit this address https://lists.apache.org/list.html?dev@hertzbeat.apache.org, and find the mail title and click to display the voting content
![图片](https://github.com/apache/incubator-hertzbeat/assets/19602424/5755ed06-529f-4739-96a8-1ac13bbb21ea)

Right-click the title and click Copy Link Address to get the link
![图片](https://github.com/apache/incubator-hertzbeat/assets/19602424/1616da5b-7891-45cc-b956-a0ba5e7ce874)

#### 3.2 Send Incubator Community voting mail

Send a voting email in the incubator community requires at least three `+1` and no `-1`.

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
https://github.com/apache/incubator-hertzbeat/releases/tag/v2.1.0-rc1

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
> git clone -b v2.1.0-rc1 git@github.com:apache/incubator-hertzbeat.git

2) build project:
> cd incubator-hertzbeat && sh ./build.sh


Thanks,

On behalf of Apache HertzBeat(Incubating) community


Best,
ChunJin Mu
```

If there is no -1 after 72 hours, reply to the email as follows

> `Send to`: general@incubator.apache.org <br />
> `cc`: dev@hertzbeat.apache.org <br />
> `Body`:

```
Thanks everyone for review and vote, 72H passed. I'll announce the vote result soon.

Best,
Chunjin Mu
```

Then the voting results will be counted, and the voting result email will be sent, as follows.

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

One item of the email content is `Vote thread`, and the link is obtained as follows: <br />
Visit this address https://lists.apache.org/list.html?general@incubator.apache.org, and find the mail title and click to display the voting content
![图片](https://github.com/apache/incubator-hertzbeat/assets/19602424/aea68925-7911-4413-8b2d-aea12685337f)
Then right-click the title and click Copy Link Address to get the link.

Wait a day to see if the tutor has any other comments, if not, send the following announcement email

## 4. Complete the final publishing steps

#### 4.1 Migrating source and binary packages

```shell
svn mv https://dist.apache.org/repos/dist/dev/incubator/hertzbeat/2.1.0-RC1 https://dist.apache.org/repos/dist/release/incubator/hertzbeat/2.1.0  -m "transfer packages for 2.1.0-RC1"
```

#### 4.2 Publish releases in the Apache Staging repository

- Log in to http://repository.apache.org , log in with your Apache account
- Click Staging repositories on the left
- Select your most recently uploaded warehouse, the warehouse specified in the voting email
- Click the Release button above, this process will perform a series of checks
> It usually takes 24 hours for the warehouse to synchronize to other data sources

#### 4.3 Add the new version download address to the official website

Add the following to the src/pages/download/data.json file on the official website

```
{
    "version": "2.1.0",
    "date": "2023-05-11"
}
```

The final file content is as follows

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

Open the official website address https://hertzbeat.apache.org/download/ to see if there is a new version of the download
> It should be noted that the download link may take effect after an hour, so please pay attention to it.

![图片](https://github.com/apache/incubator-hertzbeat/assets/19602424/e7900fb2-7bfc-4fa1-bd40-9806e6a822ef)

#### 4.4 Generate a release on github

Create a tag named v2.1.0 based on the release-2.1.0-rc1 branch, and set this tag to latest release.

Then enter Release Title and Describe
- Release Title: 
```
v2.1.0-incubating
```
- Describe:
```
Release-2.1.0-incubating
release note: https://hertzbeat.apache.org/download/release-note/2.1.0
```

![图片](https://github.com/apache/incubator-hertzbeat/assets/19602424/84723ff5-a295-471d-8265-1b8ef867c3d1)

Then click the `Publish release` button.

The rename the release-2.1.0-rc1 branch to release-2.1.0.

#### 4.5 Send new version announcement email

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
- Issue: https://github.com/apache/incubator-hertzbeat/issues
- Mailing list: dev@hertzbeat.apache.org

- Apache HertzBeat Team

Best,
ChunJin Mu
```

This version release is over.
