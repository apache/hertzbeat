const path = require('path')

const organizationName = 'usthe' // Usually your GitHub org/user name.
const projectName = 'hertzbeat' // Usually your repo name.
const branch = 'master'
const repoUrl = `https://github.com/usthe/${projectName}`
const cdnUrl = 'https://cdn.jsdelivr.net/gh/usthe/hertzbeat@gh-pages/'

module.exports = {
    title: 'TANCLOUD探云',
    tagline: '易用友好的高性能监控云',
    url: 'https://hertzbeat.com',
    baseUrl: '/',
    onBrokenLinks: 'throw',
    onBrokenMarkdownLinks: 'throw',
    favicon: cdnUrl + 'img/tancloud-logo.svg',
    organizationName,
    projectName,
    customFields: {
        repoUrl,
        cdnUrl
    },
    i18n: {
        defaultLocale: 'zh-cn',
        locales: ['zh-cn', 'en'],
    },
    themeConfig: {
        image: cdnUrl + 'img/tancloud-logo.svg',
        liveCodeBlock: {
            playgroundPosition: 'bottom',
        },
        colorMode: {
            defaultMode: 'light',
            disableSwitch: false,
            respectPrefersColorScheme: false,
            switchConfig: {
                darkIcon: '🌜',
                lightIcon: '☀️',
                // React inline style object
                // see https://reactjs.org/docs/dom-elements.html#style
                darkIconStyle: {
                    marginLeft: '2px',
                },
                lightIconStyle: {
                    marginLeft: '1px',
                },
            },
        },
        prism: {
            theme: require('prism-react-renderer/themes/github'),
            darkTheme: require('prism-react-renderer/themes/dracula'),
            additionalLanguages: ['java'],
        },
        algolia: {
            apiKey: 'c7c84bfcc1495156f5730309d821ba8c',
            indexName: 'sureness',
            // appId: 'GNVT7Z0UI2',
            contextualSearch: true,
        },
        announcementBar: {
            id: "github-star",
            content:
                '<font style="font-size: medium; font-weight: bolder">如果您喜欢TANCLOUD的开源产品HertzBeat,</font> <a target="_blank" style="font-size: medium; font-weight: bolder" rel="noopener noreferrer" href="https://github.com/dromara/sureness">欢迎在 GitHub </a> <font style="font-size: medium; font-weight: bolder"> 或 </font><a target="_blank" style="font-size: medium; font-weight: bolder" rel="noopener noreferrer" href="https://gitee.com/dromara/sureness">Gitee 给我们点赞! </a>⭐️',
            backgroundColor: '#7228B5',
            textColor: '#fafbfc',
            isCloseable: true,
        },
        navbar: {
            title: 'HertzBeat',
            logo: {
                alt: '易用友好的高性能监控云',
                src: cdnUrl + 'img/tancloud-logo.svg',
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
                    label: '其它',
                    position: 'left',
                    items: [
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
                    label: '登陆/注册',
                    href: 'https://console.tancloud.cn',
                    position: 'right',
                    className: 'header-console-link'
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
                            to: 'docs/advanced/extend-point'
                        },
                        {
                            label: '帮助文档',
                            to: 'docs/help/guide'
                        },
                    ],
                },
                {
                    title: '探云科技',
                    items: [
                        {
                            label: '交流联系',
                            to: 'docs/others/contact',
                        },
                        {
                            label: '社区网站',
                            href: 'https://support.qq.com/products/379369',
                        },
                        {
                            label: 'TANCLOUD探云',
                            href: 'https://tancloud.cn',
                        },
                        {
                            label: 'HertzBeat赫兹节拍',
                            href: 'https://hertzbeat.com',
                        },
                    ],
                },
                {
                    title: '相关资源',
                    items: [
                        {
                            label: 'Github仓库',
                            href: 'https://github.com/usthe/hertzbeat',
                        },
                        {
                            label: 'Gitee仓库',
                            href: 'https://gitee.com/usthe/hertzbeat',
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
                src: cdnUrl + 'img/tancloud-brand.svg',
                href: 'https://tancloud.cn',
            },
            copyright: '<a target="_blank" href="https://beian.miit.gov.cn/">蜀ICP备2022002218号</a>' + ` | Copyright TANCLOUD© ${new Date().getFullYear()}`,
        },
    },
    presets: [
        [
            '@docusaurus/preset-classic', {
            docs: {
                sidebarPath: require.resolve('./sidebars.json'),
                // Please change this to your repo.
                // editUrl:'https://github.com/dromara/sureness/edit/master/home/',
                editUrl: `${repoUrl}/edit/${branch}/home/`,
                editLocalizedFiles: true,
                remarkPlugins: [
                    [require('@docusaurus/remark-plugin-npm2yarn'), {sync: true}],
                ],
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
        },
        ],
    ],
    plugins: [
        [
            '@docusaurus/plugin-client-redirects',
            {
                fromExtensions: ['html'],
            }
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
        'https://cdn.jsdelivr.net/gh/buttons/buttons.github.io/buttons.js'
    ]
}
