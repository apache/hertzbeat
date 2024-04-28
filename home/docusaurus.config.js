const path = require('path')

const organizationName = 'apache' // Usually your GitHub name.
const projectName = 'hertzbeat' // Usually your repo name.
const deploymentBranch = 'asf-site' 
const branch = 'master'
const repoUrl = `https://github.com/apache/${projectName}`
const cdnUrl = null

module.exports = {
  title: 'Apache HertzBeat',
  tagline: 'An open source, real-time monitoring tool with custom-monitor and agentLess.',
  url: 'https://hertzbeat.apache.org',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'throw',
  favicon: '/img/hertzbeat-logo.svg',
  organizationName,
  projectName, 
  deploymentBranch,  
  customFields: {
    repoUrl,
    cdnUrl,
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['zh-cn', 'en'],
  },
  themeConfig: {
    image: '/img/hertzbeat-logo.svg',
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
    navbar: {
      title: 'HertzBeat',
      logo: {
        alt: 'An open source, real-time monitoring tool with custom-monitor and agentLess.',
        src: '/img/hertzbeat-brand.svg',
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
          label: 'Community',
          position: 'left',
          items: [
            {
              label: 'discuss',
              to: '/docs/community/contact',
            },
            {
              label: 'code_of_conduct',
              to: 'https://www.apache.org/foundation/policies/conduct',
            },
            {
              label: 'join_the_mailing_lists',
              to: '/docs/community/mailing_lists',
            },
            {
              label: 'become_committer',
              to: '/docs/community/become_committer',
            },
            {
              label: 'become_pmc_member',
              href: '/docs/community/become_pmc_member',
            },
            {
              label: 'new_committer_process',
              to: '/docs/community/new_committer_process',
            },
            {
              label: 'new_pmc_member_process',
              to: '/docs/community/new_pmc_ember_process',
            },
            {
              label: 'documentation_notice',
              to: '/docs/community/document',
            },
            {
              label: 'submit_code',
              to: '/docs/community/submit_code',
            },
            {
              label: 'code_style_and_quality_guide',
              to: '/docs/community/code_style_and_quality_guide'
            },
            {
              label: 'how_to_release',
              to: '/docs/community/how_to_release'
            },
            {
              label: 'how_to_verify_release',
              to: '/docs/community/how_to_verify_release'
            }
          ],
        },
        {
          label : 'team',
          position: 'left',
          to : '/team/',
          activeBaseRegex: `/team`,
        },
        {
          label: 'ASF',
          position: 'left',
          items: [
            {
              label: 'Foundation',
              to: 'https://www.apache.org/',
            },
            {
              label: 'License',
              to: 'https://www.apache.org/licenses/',
            },
            {
              label: 'Events',
              to: 'https://eu.communityovercode.org/',
            },
            {
              label: 'Security',
              href: 'https://www.apache.org/security/',
            },
            {
              label: 'Sponsorship',
              to: 'https://www.apache.org/foundation/sponsorship.html',
            },
            {
              label: 'Privacy',
              to: 'https://privacy.apache.org/policies/privacy-policy-public.html',
            },
            {
              label: 'Thanks',
              to: 'https://www.apache.org/foundation/sponsors',
            }
          ],
        },
        {
          label: 'Others',
          position: 'left',
          items: [
            {
              label: 'contributors',
              to : '/team/',
              activeBaseRegex: `/team`,
            },
            {
              label: 'contributing',
              to: '/docs/community/mailing_lists',
            },
            {
              label: 'kanban',
              href: 'https://github.com/orgs/apache/projects/348',
            },
            {
              label: 'resource',
              to: '/docs/others/resource',
            }
          ],
        },
        {
          type: 'docsVersionDropdown',
          position: 'right',
          dropdownActiveClassDisabled: true,
        },
        {
          type: 'localeDropdown',
          position: 'right',
        }, 
        {
          href: repoUrl,
          position: 'right',
          className: 'header-github-link'
        }, 
        {
          href: 'https://twitter.com/hertzbeat1024',
          position: 'right',
          className: 'header-twitter-link'
        }, 
        {
          href: 'https://www.youtube.com/channel/UCri75zfWX0GHqJFPENEbLow',
          position: 'right',
          className: 'header-youtube-link'
        }, 
        {
          href: 'https://discord.gg/Fb6M73htGr',
          position: 'right',
          className: 'header-discord-link'
        }
      ],
    },
    footer: {
      style: 'light',
      links: [
        {
          title: 'intro',
          items: [
            {
              label: 'quickstart',
              to: '/docs/start/quickstart',
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
              label: 'discussion',
              href: 'https://github.com/apache/hertzbeat/discussions/',
            },
            {
              label: 'contact',
              to: '/docs/community/contact',
            }
          ],
        },
        {
          title: 'resource',
          items: [
            {
              label: 'github',
              href: 'https://github.com/apache/hertzbeat',
            },
            {
              label: 'relate',
              to: '/docs/others/resource',
            },
          ],
        },
      ],
      logo: {
        alt: 'HertzBeat',
        src: '/img/hertzbeat-brand.svg',
        href: 'https://github.com/apache/hertzbeat',
      },
      copyright:
        `
        <div style="text-align: left;margin-top:30px">
          <div style="align-items: center; display: flex">
            <div style="width: 1200px; background-color: #282c77; padding: 10px; border-radius: 6px">
              <a href="https://incubator.apache.org/">
                <img src="/img/icons/apache-incubator.svg" alt="Apache Incubator logo">
              </a>
            </div>
            <div style="margin-left: 40px">
              <p style="font-size: 14px;line-height: 25px;">
              Apache HertzBeat is an effort undergoing incubation at The Apache Software Foundation (ASF), sponsored by the Apache Incubator. Incubation is required of all newly accepted projects until a further review indicates that the infrastructure, communications, and decision making process have stabilized in a manner consistent with other successful ASF projects. While incubation status is not necessarily a reflection of the completeness or stability of the code, it does indicate that the project has yet to be fully endorsed by the ASF.
              </p>
            </div>
          </div>

          <div style="border-top: 1px solid #525252;min-height: 60px;line-height: 25px;text-align: left;font-size: 14px;display: flex;align-items: center;">
            <span>
              Copyright © ${new Date().getFullYear()} The Apache Software Foundation. Apache HertzBeat, HertzBeat, and its feather logo are trademarks of The Apache Software Foundation.
            </span>
          </div>
        </div>`,
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
            copyright: `Copyright © ${new Date().getFullYear()} Apache HertzBeat.`,
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
            href: 'img/hertzbeat-logo.svg',
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
            href: 'img/hertzbeat-logo.svg',
          },
          {
            tagName: 'link',
            rel: 'mask-icon',
            href: 'img/hertzbeat-logo.svg',
            color: 'rgb(234, 90, 7)',
          },
          {
            tagName: 'meta',
            name: 'msapplication-TileImage',
            content: 'img/hertzbeat-logo.svg',
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
