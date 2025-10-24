# HertzBeat Website

This website is built with [Docusaurus](https://docusaurus.io/).

## Installation

```shell
yarn install
## yarn install --registry=https://registry.npmmirror.com
```

## I18N

```console
yarn write-translations --locale zh-cn

yarn write-translations --locale en
```

## Local Development

```console
yarn start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Team Page

### Member

Update the member information in `src/pages/team/data/member.json` File.

### Contributor

Please refer to the [All Contributors](https://allcontributors.org/) to auto add contributor.

```console
yarn all-contributors generate
```

Use generate to read the contributors list from `.all-contributorsrc` file and update the contributor tables specified by the files key.

### Avatar

```console
yarn github-avatar
```

This command will fetch the base64 string of the GitHub avatar from file `src/pages/team/data/member.json` and `.all-contributorsrc`, and store the result in the `src/pages/team/data/` directory. The operation might take a little while.

## Build

```console
yarn build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## Deployment

```console
GIT_USER=<Your GitHub username> USE_SSH=true yarn deploy
OR
USE_SSH=true yarn deploy
```

If you are using GitHub pages for hosting, this command is a convenient way to build the website and push to the `gh-pages` branch.

### Deployment to Gitee

```console
GITHUB_HOST=gitee.com USE_SSH=true yarn deploy  
```

### Archive Version

```shell
yarn docusaurus docs:version v1.5.x
```

## Directory Structure

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
