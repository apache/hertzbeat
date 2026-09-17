---
id: how_to_verify_release
title: How to Verify Release
sidebar_position: 4
---

## Verify the candidate version

For the detailed check list, please refer to the ASF [release policy](https://www.apache.org/legal/release-policy.html) and [release publishing guide](https://infra.apache.org/release-publishing.html)

Version content accessible in browser [https://dist.apache.org/repos/dist/dev/hertzbeat/](https://dist.apache.org/repos/dist/dev/hertzbeat/)

### 1. Download the candidate version

Download the candidate version to be released to the local environment Need to rely on gpg tool, if not, it is recommended to install `gpg2`.

:::caution

If the network is poor, downloading may be time-consuming. The download is completed normally in about 20 minutes, please wait patiently.

:::

```shell
# Replace {version} and RC1 with the version and candidate under vote, e.g. 1.9.0 and RC2

# if there is svn locally, you can check out the whole directory
$ svn co https://dist.apache.org/repos/dist/dev/hertzbeat/{version}-RC1/

# or download a single artifact directly
$ wget https://dist.apache.org/repos/dist/dev/hertzbeat/{version}-RC1/apache-hertzbeat-{version}-src.tar.gz
```

### 2. Verify that the uploaded version is compliant

Start the verification process, which includes but is not limited to the following content and forms.

#### 2.1 Check whether the release package is complete

The package uploaded to dist must include the source code package, and the binary package is optional.

1. Whether to include the source code package
2. Whether to include the signature of the source code package
3. Whether to include the sha512 of the source code package
4. If binary packages are uploaded (including the native collector packages), check items 2 and 3 for every one of them

> **Every** artifact must have a matching `.asc` and `.sha512`, with no exception. This loop reports
> anything missing:
>
> ```shell
> for i in *.tar.gz *.zip; do
>   [ -e "$i.asc" ]    || echo "missing signature: $i"
>   [ -e "$i.sha512" ] || echo "missing checksum:  $i"
> done
> ```

#### 2.2 Check gpg signature

First import the publisher's public key. Import KEYS from the svn repository to the local environment. (The person who releases the version does not need to import it again, the person who helps to do the verification needs to import it, and the user name is enough for the person who issued the version)

##### 2.2.1 Import public key

```shell
curl https://downloads.apache.org/hertzbeat/KEYS > KEYS # Download KEYS
gpg --import KEYS # Import KEYS to local
```

##### 2.2.2 About trusting the public key

:::tip Verifying a signature does not require trusting the key
`gpg --verify` prints `Good signature` for an untrusted key as well, it only adds a warning:

```text
WARNING: This key is not certified with a trusted signature!
```

**That warning is expected. As long as `Good signature` appears, the check passes.**

If you still want to silence it, you can set a trust level as shown below. Note that
`5 = ultimate` means "this is my own key" in GPG terms, and marking someone else's key ultimate
pollutes your local web of trust, so `4 = fully` is usually the better choice.
:::

Set the trust level of the KEY used in this version (optional):

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

##### 2.2.3 Check the gpg signature

```shell
# cover *.zip as well, the Windows native collector package is a zip and a
# *.tar.gz-only loop skips it silently
for i in *.tar.gz *.zip; do echo $i; gpg --verify $i.asc $i; done
```

check result

> If something like the following appears, it means the signature is correct. Keyword: **`Good signature`**

```shell
apache-hertzbeat-${release_version}-src.tar.gz
gpg: Signature made XXXX
gpg: using RSA key XXXXX
gpg: Good signature from "XXX <xxx@apache.org>"
```

#### 2.3 Check sha512 hash

```shell
for i in *.tar.gz *.zip; do echo $i; sha512sum --check "$i.sha512"; done

# on macOS, if sha512sum is missing, use the bundled shasum instead
# for i in *.tar.gz *.zip; do echo $i; shasum -a 512 -c "$i.sha512"; done
```

#### 2.4 Check the binary package

unzip  `apache-hertzbeat-${release.version}-bin.tar.gz`

```shell
tar -xzvf apache-hertzbeat-${release.version}-bin.tar.gz
```

check as follows:

- [ ] Check whether the source package contains unnecessary files, which makes the tar package too large
- [ ] There are `LICENSE` and `NOTICE` files
- [ ] The year in the `NOTICE` file is correct
- [ ] Only text files exist, not binary files
- [ ] All files have ASF license at the beginning
- [ ] Able to compile correctly
- [ ] .....

#### 2.5 Check the native collector packages

The native collector packages (`apache-hertzbeat-collector-native-{version}-*`) are **pre-compiled
native executables**. The source build check below does not apply to them, so check them separately.

```shell
tar -xzf apache-hertzbeat-collector-native-{version}-linux-amd64-bin.tar.gz
cd apache-hertzbeat-collector-native-{version}-linux-amd64-bin
MANAGER_HOST=127.0.0.1 ./bin/startup.sh
tail -f logs/startup.log
```

Check the following:

- [ ] `LICENSE`, `NOTICE` and the `licenses/` directory exist
- [ ] it starts: the log shows `Started Collector` and `Registered N collect strategies`
- [ ] the process is still alive ten seconds later (**a crash can happen after `Started Collector`**,
      so that line alone is not enough)

:::caution The native packages have hard runtime requirements
When they are not met the process exits instantly with no log output at all, which is easy to
mistake for a corrupted artifact. Check your environment first:

- **x86 packages need AVX2**: Intel Haswell (2013) and later, AMD Zen (2017) and later. Some
  Atom-family low-end chips, Rosetta 2 on Apple Silicon and older Windows on ARM emulation do not
  support it
- **Linux packages need glibc 2.34 or newer**: Ubuntu 22.04+, Debian 12+, RHEL/Rocky 9+ work;
  Ubuntu 20.04, Debian 11, RHEL 8 and CentOS 7 do not
- **the Windows package needs** Windows 10 / Server 2016 or newer with the Microsoft Visual C++
  2015-2022 Redistributable installed

An unmet requirement is a known limitation, not a reason to vote -1. Please state the environment
you verified on in your reply.
:::

#### 2.6 Check the source package

> If the binary/web-binary package is uploaded, check the binary package.

Unzip `apache-hertzbeat-${release_version}-src.tar.gz`

```shell
cd apache-hertzbeat-${release_version}-src
```

compile the source code: [Build HertzBeat Binary Package](https://hertzbeat.apache.org/docs/community/development/#build-hertzbeat-binary-package)

and check as follows:

- [ ] There are `LICENSE` and `NOTICE` files
- [ ] The year in the `NOTICE` file is correct
- [ ] All text files have ASF license at the beginning
- [ ] Check the third-party dependent license:
- [ ] Compatible with third-party dependent licenses
- [ ] All third-party dependent licenses are named in the `LICENSE` file
- [ ] If you are relying on the Apache license and there is a `NOTICE` file, then these `NOTICE` files also need to be added to the version of the `NOTICE` file
- [ ] .....

You can refer to this article: [ASF Third Party License Policy](https://apache.org/legal/resolved.html)

### 3. Email reply

If you initiate a posting vote, you can refer to this response example to reply to the email after verification

:::caution Attention
When replying to the email, you must bring the information that you have checked by yourself. Simply replying to `+1 approve` is invalid.

When new PMC votes in the [dev@hertzbeat.apache.org](mailto:dev@hertzbeat.apache.org) hertzbeat community, Please bring the binding suffix to indicate that it has a binding vote for the vote in the hertzbeat community, and it is convenient to count the voting results.
:::

Non-PMC member:

```text
+1 (non-binding)
I checked:
     1. All download links are valid
     2. Checksums and signatures are OK for all artifacts, including the .zip
     3. LICENSE and NOTICE exist and are correct
     4. Built successfully from source on <your OS and version>
     5. Native collector package starts and registers its collect strategies
     6.
```

PMC member:

```text
+1 (binding)
I checked:
     1. All download links are valid
     2. Checksums and signatures are OK for all artifacts, including the .zip
     3. LICENSE and NOTICE exist and are correct
     4. Built successfully from source on <your OS and version>
     5. Native collector package starts and registers its collect strategies
     6.
```

When you find a problem, give enough detail for the release manager to reproduce it:

```text
-1 (binding)

The <artifact name> is missing its .sha512 checksum.

Checked on: macOS 26 / arm64
Steps:
    1. svn co https://dist.apache.org/repos/dist/dev/hertzbeat/1.9.0-RC2/
    2. for i in *.tar.gz *.zip; do [ -e "$i.sha512" ] || echo "missing: $i"; done
Output:
    missing: apache-hertzbeat-collector-native-1.9.0-windows-amd64-bin.zip
```

---
