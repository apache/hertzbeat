---
id: how_to_verify_release
title: How to Verify Release
sidebar_position: 4
---

# Verify the candidate version

For detailed check list, please refer to the official [check list](https://cwiki.apache.org/confluence/display/INCUBATOR/Incubator+Release+Checklist)

## 1. Download the candidate version

Download the candidate version to be released to the local environment Need to rely on gpg tool, if not, it is recommended to install `gpg2`.

:::caution

If the network is poor, downloading may be time-consuming. The download is completed normally in about 20 minutes, please wait patiently.

:::

```shell
#If there is svn locally, you can clone to the local
$ svn co https://dist.apache.org/repos/dist/dev/incubator/hertzbeat/${release_version}-${rc_version}/
#or download the material file directly
$ wget https://dist.apache.org/repos/dist/dev/incubator/hertzbeat/${release_version}-${rc_version}/xxx.xxx
```

## 2. Verify that the uploaded version is compliant

Start the verification process, which includes but is not limited to the following content and forms.

### 2.1 Check whether the release package is complete

The package uploaded to dist must include the source code package, and the binary package is optional.

1. Whether to include the source code package
2. Whether to include the signature of the source code package
3. Whether to include the sha512 of the source code package
4. If the binary package is uploaded, also check the contents listed in (2)-(4)


### 2.2 Check gpg signature

First import the publisher's public key. Import KEYS from the svn repository to the local environment. (The person who releases the version does not need to import it again, the person who helps to do the verification needs to import it, and the user name is enough for the person who issued the version)

#### 2.2.1 Import public key

```shell
$ curl  https://downloads.apache.org/incubator/hertzbeat/KEYS > KEYS # Download KEYS
$ gpg --import KEYS # Import KEYS to local
```
#### 2.2.2 Trust the public key

Trust the KEY used in this version:

```shell
$ gpg --edit-key xxxxxxxxxx #KEY user used in this version
gpg (GnuPG) 2.2.21; Copyright (C) 2020 Free Software Foundation, Inc.
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.

Secret key is available.
gpg> trust #trust
Please decide how far you trust this user to correctly verify other users' keys
(by looking at passports, checking fingerprints from different sources, etc.)

  1 = I don't know or won't say
  2 = I do NOT trust
  3 = I trust marginally
  4 = I trust fully
  5 = I trust ultimately
  m = back to the main menu

Your decision? 5 #choose 5
Do you really want to set this key to ultimate trust? (y/N) y  #choose y
                                                            
gpg>
         
```

#### 2.2.3 Check the gpg signature

```shell
$ for i in *.tar.gz; do echo $i; gpg --verify $i.asc $i; done
```

check result

> If something like the following appears, it means the signature is correct. Keyword: **`Good signature`**

```shell
apache-hertzbeat-xxx-incubating-src.tar.gz
gpg: Signature made XXXX
gpg: using RSA key XXXXX
gpg: Good signature from "xxx @apache.org>"
```

### 2.3 Check sha512 hash

```shell
$ for i in *.tar.gz; do echo $i; sha512sum --check  $i.sha512; done
```

### 2.4 Check the binary package

unzip  `apache-hertzbeat_${scala.version}-${release.version}-incubating-bin.tar.gz`

```shell
# scala 2.11 
tar -xzvf apache-hertzbeat_2.11-${release.version}-incubating-bin.tar.gz

# scala 2.12 
tar -xzvf apache-hertzbeat_2.12-${release.version}-incubating-bin.tar.gz
```

check as follows:

- [ ] Check whether the source package contains unnecessary files, which makes the tar package too large
- [ ] Folder contains the word `incubating`
- [ ] There are `LICENSE` and `NOTICE` files
- [ ] There is a `DISCLAIMER` or `DISCLAIMER-WIP` file
- [ ] The year in the `NOTICE` file is correct
- [ ] Only text files exist, not binary files
- [ ] All files have ASF license at the beginning
- [ ] Able to compile correctly
- [ ] Check for extra files or folders, such as empty folders, etc.
- [ ] .....



### 2.5 Check the source package

> If the binary/web-binary package is uploaded, check the binary package.

Unzip `apache-hertzbeat-${release_version}-incubating-src.tar.gz`

```shell
cd apache-hertzbeat-${release_version}-incubating-src

# execute build.sh
./build.sh
```

***package mode, just select mixed mode ***

>[HertzBeat] HertzBeat supports front-end and server-side mixed / detached packaging mode, Which mode do you need ?
>
>1. mixed mode
>
>2. detached mode
>
>  select 1

>[HertzBeat] HertzBeat supports Scala 2.11 and 2.12. Which version do you need ?
>
>1. 2.11
>2. 2.12
>

It takes about 8 minutes to compile once. After the compilation is completed, the ***dist*** directory will be generated under the project root path, and the final compiled project binary will be placed here, and the following checks will be made:

and check as follows:
- [ ] There are `LICENSE` and `NOTICE` files
- [ ] There is a `DISCLAIMER` or `DISCLAIMER-WIP` file
- [ ] The year in the `NOTICE` file is correct
- [ ] All text files have ASF license at the beginning
- [ ] Check the third-party dependent license:
- [ ] Compatible with third-party dependent licenses
- [ ] All third-party dependent licenses are named in the `LICENSE` file
- [ ] If you are relying on the Apache license and there is a `NOTICE` file, then these `NOTICE` files also need to be added to the version of the `NOTICE` file
- [ ] .....

You can refer to this article: [ASF Third Party License Policy](https://apache.org/legal/resolved.html)


## 3. Email reply

If you initiate a posting vote, you can refer to this response example to reply to the email after verification
<font color="red">
When replying to the email, you must bring the information that you have checked by yourself. Simply replying to `+1 approve` is invalid.

When PPMC votes in the dev@hertzbeat.apache.org hertzbeat community, Please bring the binding suffix to indicate that it has a binding vote for the vote in the hertzbeat community, and it is convenient to count the voting results.

When IPMC votes in the general@incubator.apache.org incubator community. Please bring the binding suffix to indicate that the voting in the incubator community has a binding vote, which is convenient for counting the voting results.
</font>

:::caution

If you have already voted on dev@hertzbeat.apache.org, you can take it directly to the incubator community when you reply to the vote, such as:

```html
//Incubator community voting, only IPMC members have binding binding，PPMC needs to be aware of binding changes
Forward my +1 from dev@listhertzbeatnkis (non-binding)
Copy my +1 from hertzbeat DEV ML (non-binding)
````

:::


Non-PPMC/Non-IPMC member:

```text
+1 (non-binding)
I checked:
     1. All download links are valid
     2. Checksum and signature are OK
     3. LICENSE and NOTICE are exist
     4. Build successfully on macOS(Big Sur)
     5. 
````

PPMC/IPMC member:

```text
//Incubator community voting, only IPMC members have binding binding
+1 (binding)
I checked:
     1. All download links are valid
     2. Checksum and signature are OK
     3. LICENSE and NOTICE are exist
     4. Build successfully on macOS(Big Sur)
     5. 
````


## 4. Precautions

<font color="red">
If you have maven tools installed, you can replace ./mvnw or mvnw.cmd with your own mvn command
mvnw is short for Maven Wrapper. It can support running Maven projects without installing Maven and configuring environment variables. If it can't find it, it will download the corresponding Maven version according to the configuration file
</font>
