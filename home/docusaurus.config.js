const path = require('path')

const organizationName = 'dromara' // Usually your GitHub name.
const projectName = 'hertzbeat' // Usually your repo name.
const branch = 'master'
const repoUrl = `https://github.com/dromara/${projectName}`
const cdnUrl = 'https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages'

module.exports = {
  title: 'HertzBeat',
  tagline: 'An open source, real-time monitoring tool with custom-monitor and agentLess.',
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
    defaultLocale: 'en',
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
      apiKey: '9298a61d23b2842ce077324283fb0abb',
      indexName: 'hertzbeat',
      appId: 'JMM99UL1H5',
      contextualSearch: true,
    },
    announcementBar: {
      id: 'github-star',
      content:
        '<font style="font-size: medium; font-weight: bolder">If you like HertzBeat,</font> <a target="_blank" style="font-size: medium; font-weight: bolder" rel="noopener noreferrer" href="https://github.com/dromara/hertzbeat">star us on GitHub </a> <font style="font-size: medium; font-weight: bolder"> or </font><a target="_blank" style="font-size: medium; font-weight: bolder" rel="noopener noreferrer" href="https://gitee.com/dromara/hertzbeat">Gitee! </a>⭐️⭐️',
      backgroundColor: '#7228B5',
      textColor: '#fafbfc',
      isCloseable: true,
    },
    navbar: {
      title: 'HertzBeat',
      logo: {
        alt: 'An open source, real-time monitoring tool with custom-monitor and agentLess.',
        src: '/img/tancloud-logo.svg',
      },
      items: [
        {
          label: 'Docs',
          position: 'left',
          to: '/docs/',
        },
        {
          label: 'blog',
          position: 'left',
          to: '/blog/',
        },
        {
          label: 'Others',
          position: 'left',
          items: [
            {
              label: 'discuss',
              to: '/docs/others/contact',
            },
            {
              label: 'contributors',
              to: '/docs/others/developer',
            },
            {
              label: 'contributing',
              to: '/docs/others/contributing',
            },
            {
              label: 'kanban',
              href: 'https://github.com/orgs/dromara/projects/6',
            },
            {
              label: 'design',
              to: '/docs/others/design',
            },
            {
              label: 'sponsor',
              to: '/docs/others/sponsor',
            },
            {
              label: 'resource',
              to: '/docs/others/resource',
            }
          ],
        },
        {
          label: '开源之夏',
          position: 'left',
          href: 'https://summer-ospp.ac.cn/org/orgdetail/bef415f7-741e-4db8-a4ff-b3904c502471',
        },
        {
          label: '华为云开源活动',
          position: 'left',
          to: '/docs/others/huaweicloud',
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
          label: 'login',
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
          title: 'intro',
          items: [
            {
              label: 'use',
              to: '/docs/',
            },
            {
              label: 'quickstart',
              to: '/docs/start/quickstart',
            },
            {
              label: 'custom',
              to: '/docs/advanced/extend-point',
            },
            {
              label: 'help',
              to: '/docs/help/guide',
            },
          ],
        },
        {
          title: 'contact',
          items: [
            {
              label: 'dromara',
              href: 'https://dromara.org/',
            },
            {
              label: 'discuss',
              to: '/docs/others/contact',
            },
            {
              label: 'team',
              href: 'https://support.qq.com/products/379369/team',
            },
            {
              label: 'tancloud',
              href: 'https://tancloud.cn',
            },
          ],
        },
        {
          title: 'resource',
          items: [
            {
              label: 'github',
              href: 'https://github.com/dromara/hertzbeat',
            },
            {
              label: 'gitee',
              href: 'https://gitee.com/dromara/hertzbeat',
            },
            {
              label: 'relate',
              to: '/docs/others/resource',
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
        ` | Copyright © 2021-${new Date().getFullYear()} TANCLOUD`,
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
              label: 'current',
              path: '',
            },
          },
        },
        blog: {
          showReadingTime: true,
          postsPerPage: 1,
          feedOptions: {
            type: 'all',
            copyright: `Copyright © ${new Date().getFullYear()} TANCLOUD, Inc.`,
          },
          // Please change this to your repo.
          editUrl: `${repoUrl}/edit/${branch}/home/`,
          editLocalizedFiles: true,
          blogSidebarCount: 'ALL'
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
