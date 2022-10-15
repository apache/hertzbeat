const path = require('path')

const organizationName = 'dromara' // Usually your GitHub org/user name.
const projectName = 'hertzbeat' // Usually your repo name.
const branch = 'master'
const repoUrl = `https://github.com/dromara/${projectName}`
const cdnUrl = 'https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages'

module.exports = {
  title: 'HertzBeat',
  tagline: '易用友好的实时监控系统',
  url: 'https://hertzbeat.com',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'throw',
  favicon: '/img/tancloud-logo.svg',
  organizationName,
  projectName,
  customFields: {
    repoUrl,
    cdnUrl,
  },
  i18n: {
    defaultLocale: 'zh-cn',
    locales: ['zh-cn', 'en'],
  },
  themeConfig: {
    image: '/img/tancloud-logo.svg',
    liveCodeBlock: {
      playgroundPosition: 'bottom',
    },
    metadata: [
      {
        name: 'keywords',
        content: 'monitor, apm, 监控, 开源, uptime, opensource',
      },
    ],
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    prism: {
      theme: require('prism-react-renderer/themes/github'),
      darkTheme: require('prism-react-renderer/themes/dracula'),
      additionalLanguages: ['java'],
    },
    algolia: {
      apiKey: 'c7c84bfcc1495156f5730309d821ba8c',
      indexName: 'sureness',
      appId: 'GNVT7Z0UI2',
      contextualSearch: true,
    },
    announcementBar: {
      id: 'github-star',
      content:
        '<font style="font-size: medium; font-weight: bolder">If you like HertzBeat,</font> <a target="_blank" style="font-size: medium; font-weight: bolder" rel="noopener noreferrer" href="https://github.com/dromara/hertzbeat">give us a star on GitHub </a> <font style="font-size: medium; font-weight: bolder"> or </font><a target="_blank" style="font-size: medium; font-weight: bolder" rel="noopener noreferrer" href="https://gitee.com/dromara/hertzbeat">Gitee please! </a>⭐️⭐️',
      backgroundColor: '#7228B5',
      textColor: '#fafbfc',
      isCloseable: true,
    },
    navbar: {
      title: 'HertzBeat',
      logo: {
        alt: '易用友好的高性能监控云',
        src: '/img/tancloud-logo.svg',
      },
      items: [
        {
          label: '首页',
          position: 'left',
          to: '/',
        },
        {
          label: '文档',
          position: 'left',
          to: 'docs/',
        },
        {
          label: '博客',
          position: 'left',
          to: 'blog/',
        },
        {
          label: '讨论交流',
          position: 'left',
          to: 'docs/others/contact',
        },
        {
          label: '私有化部署',
          position: 'left',
          to: 'docs/others/private',
        },
        {
          label: '关于',
          position: 'left',
          items: [
            {
              label: '贡献者指南',
              to: 'docs/others/contributing',
            },
            {
              label: '项目看板',
              href: 'https://github.com/dromara/hertzbeat/projects/1',
            },
            {
              label: '设计文档',
              to: 'docs/others/design',
            },
            {
              label: '赞助我们',
              to: 'docs/others/sponsor',
            },
            {
              label: '相关资源',
              to: 'docs/others/resource',
            },
          ],
        },
        {
          type: 'docsVersionDropdown',
          position: 'right',
          // dropdownItemsAfter: [{to: '/versions', label: '所有版本'}],
          dropdownActiveClassDisabled: true,
        },
        {
          type: 'localeDropdown',
          position: 'right',
        },
        {
          label: '登录/注册',
          href: 'https://console.tancloud.cn',
          position: 'right',
          className: 'header-console-link',
        },
      ],
    },
    footer: {
      style: 'light',
      links: [
        {
          title: '产品介绍',
          items: [
            {
              label: '使用介绍',
              to: 'docs/',
            },
            {
              label: '安装文档',
              to: 'docs/start/quickstart',
            },
            {
              label: '自定义监控',
              to: 'docs/advanced/extend-point',
            },
            {
              label: '帮助文档',
              to: 'docs/help/guide',
            },
          ],
        },
        {
          title: '社区交流',
          items: [
            {
              label: 'Dromara开源社区',
              href: 'https://dromara.org/',
            },
            {
              label: '交流联系',
              to: 'docs/others/contact',
            },
            {
              label: '我们的故事',
              href: 'https://support.qq.com/products/379369/team',
            },
            {
              label: 'TanCloud探云',
              href: 'https://tancloud.cn',
            },
          ],
        },
        {
          title: '相关资源',
          items: [
            {
              label: 'Github仓库',
              href: 'https://github.com/dromara/hertzbeat',
            },
            {
              label: 'Gitee仓库',
              href: 'https://gitee.com/dromara/hertzbeat',
            },
            {
              label: '相关资源',
              to: 'docs/others/resource',
            },
          ],
        },
      ],
      logo: {
        alt: 'TANCLOUD探云-易用友好的高性能监控云',
        src: '/img/planet.jpg',
        href: 'https://github.com/dromara/hertzbeat',
      },
      copyright:
        '<a target="_blank" href="https://beian.miit.gov.cn/">蜀ICP备2022002218号</a>' +
        ` | Copyright TANCLOUD© ${new Date().getFullYear()}`,
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.json'),
          // Please change this to your repo.
          editUrl: `${repoUrl}/edit/${branch}/home/`,
          editLocalizedFiles: true,
          remarkPlugins: [
            [require('@docusaurus/remark-plugin-npm2yarn'), { sync: true }],
          ],
          lastVersion: 'current',
          versions: {
            current: {
              label: 'v1.1.x',
              path: '',
            },
          },
        },
        blog: {
          showReadingTime: true,
          postsPerPage: 3,
          feedOptions: {
            type: 'all',
            copyright: `Copyright © ${new Date().getFullYear()} TANCLOUD, Inc.`,
          },
          // Please change this to your repo.
          editUrl: `${repoUrl}/edit/${branch}/home/`,
          editLocalizedFiles: true,
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
        },
      },
    ],
  ],
  plugins: [
    [
      '@docusaurus/plugin-client-redirects',
      {
        fromExtensions: ['html'],
      },
    ],
    '@docusaurus/plugin-ideal-image',
    [
      '@docusaurus/plugin-pwa',
      {
        debug: false,
        offlineModeActivationStrategies: ['appInstalled', 'queryString'],
        // swRegister: false,
        swCustom: path.resolve(__dirname, 'src/sw.js'),
        pwaHead: [
          {
            tagName: 'link',
            rel: 'icon',
            href: 'img/tancloud-logo.svg',
          },
          {
            tagName: 'link',
            rel: 'manifest',
            href: 'manifest.json',
          },
          {
            tagName: 'meta',
            name: 'theme-color',
            content: 'rgb(234, 90, 7)',
          },
          {
            tagName: 'meta',
            name: 'apple-mobile-web-app-capable',
            content: 'yes',
          },
          {
            tagName: 'meta',
            name: 'apple-mobile-web-app-status-bar-style',
            content: '#000',
          },
          {
            tagName: 'link',
            rel: 'apple-touch-icon',
            href: 'img/tancloud-logo.svg',
          },
          {
            tagName: 'link',
            rel: 'mask-icon',
            href: 'img/tancloud-logo.svg',
            color: 'rgb(234, 90, 7)',
          },
          {
            tagName: 'meta',
            name: 'msapplication-TileImage',
            content: 'img/tancloud-logo.svg',
          },
          {
            tagName: 'meta',
            name: 'msapplication-TileColor',
            content: '#000',
          },
        ],
      },
    ],
  ],
  themes: ['@docusaurus/theme-live-codeblock'],
  scripts: [
    {
      src: 'https://hm.baidu.com/hm.js?77fb03ed1c6c1267119fec6d84dd88f3',
      async: true,
    },
  ],
}
