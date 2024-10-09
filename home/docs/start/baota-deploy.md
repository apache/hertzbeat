---
id: baota-deploy  
title: Use BaoTa Panel Deploy HertzBeat  
sidebar_label: Install via BaoTa
---

Apache HertzBeat (incubating) supports one-click deployment in the `Docker` application store of the BaoTa panel.

## Prerequisites

Install BaoTa panel, see [BaoTa Panel Quick Install](https://www.bt.cn/new/download.html).

## Install Docker

> Install the Docker service in the BaoTa panel, skip if you already have it.

Log in to the BaoTa panel, click `Docker` in the left menu, and install the `Docker` and `Docker Compose` services as prompted.

## Deploy HertzBeat

Log in to the BaoTa panel, click `Application Store` in the left menu, search for `HertzBeat` in the search box, and you can quickly install it.

## Open the Port

> HertzBeat uses the `1157` port by default, and you need to open this port in the security group.

Log in to the BaoTa panel, click `Security` in the left menu, and add the `1157` port to the firewall.

## Access HertzBeat

After the installation is complete, visit `http://<BaoTa panel IP>:1157` in your browser to access the HertzBeat console.
