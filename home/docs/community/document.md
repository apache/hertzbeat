---
id: 'document'
title: 'Documentation Notice'
sidebar_position: 1
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

Good documentation is critical for any type of software. Any contribution that can improve the HertzBeat documentation is welcome.

## Get the document project

Documentation for the HertzBeat project is maintained in [git repository home directory](https://github.com/apache/hertzbeat/tree/master/home).

First you need to fork the document project into your own github repository, and then clone the document to your local computer.

```shell
git clone git@github.com:<your-github-user-name>/hertzbeat.git
```

## Preview and generate static files

This website is compiled using node, using Docusaurus framework components

1. Download and install nodejs (version 18.8.0)
2. Clone the code to the local `git clone git@github.com:apache/hertzbeat.git`
3. In `home` directory run `npm install` to install the required dependent libraries.
4. In `home` directory run `npm run start`, you can visit http://localhost:3000 to view the English mode preview of the site
5. In `home` directory run `npm run start-zh-cn`, you can visit http://localhost:3000 to view the Chinese mode preview of the site
6. To generate static website resource files, run `npm run build`. The static resources of the build are in the build directory.

## Directory structure

```html
|-- docs
|-- blog   
|-- i18n
|   `-- zh-CN  // internationalized chinese
|       |-- code.json
|       |-- docusaurus-plugin-content-blog
|       |-- docusaurus-plugin-content-docs
|       `-- docusaurus-theme-classic
|-- resource  // static resource file
|-- src
|   |-- theme
|   |-- css
|   |-- js
|   |-- pages
|   |   |-- components
|   |   |-- index.js
|   |-- constants.js
|-- static // picture static resource
|   |-- img  //
|   |   |-- blog // blog picture
|   |   |-- docs // document picture
|   |   |-- home // product picture
|   |   |-- icons // icon
|-- docusaurus.config.js
|-- sidebars.js // document sidebar menu configuration
```

## Specification

### Naming convention of  files

All lowercase, separated by a dash

Positive example: `render-dom.js / signup.css / index.html / company-logo.png`

Counter example: `renderDom.js / UserManagement.html`

### Resource Path

Image resources are unified under `static/img/{module name}`

css and other style files are placed in the `src/css` directory

### Page content modification

> All pages doc can be directly jumped to the corresponding github resource modification page through the 'Edit this page' button at the bottom

### Page style modification

Visit the page https://hertzbeat.apache.org/
位于 `src/pages/components`

