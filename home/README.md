# HertzBeat Website

This website is built using [Docusaurus 2](https://docusaurus.io/).    
Learn From [webdriverio](https://webdriver.io/)                

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
