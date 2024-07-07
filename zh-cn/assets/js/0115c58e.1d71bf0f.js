"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[25405],{15680:(e,n,t)=>{t.d(n,{xA:()=>m,yg:()=>c});var r=t(96540);function i(e,n,t){return n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t,e}function a(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);n&&(r=r.filter((function(n){return Object.getOwnPropertyDescriptor(e,n).enumerable}))),t.push.apply(t,r)}return t}function o(e){for(var n=1;n<arguments.length;n++){var t=null!=arguments[n]?arguments[n]:{};n%2?a(Object(t),!0).forEach((function(n){i(e,n,t[n])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):a(Object(t)).forEach((function(n){Object.defineProperty(e,n,Object.getOwnPropertyDescriptor(t,n))}))}return e}function p(e,n){if(null==e)return{};var t,r,i=function(e,n){if(null==e)return{};var t,r,i={},a=Object.keys(e);for(r=0;r<a.length;r++)t=a[r],n.indexOf(t)>=0||(i[t]=e[t]);return i}(e,n);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(r=0;r<a.length;r++)t=a[r],n.indexOf(t)>=0||Object.prototype.propertyIsEnumerable.call(e,t)&&(i[t]=e[t])}return i}var l=r.createContext({}),s=function(e){var n=r.useContext(l),t=n;return e&&(t="function"==typeof e?e(n):o(o({},n),e)),t},m=function(e){var n=s(e.components);return r.createElement(l.Provider,{value:n},e.children)},d={inlineCode:"code",wrapper:function(e){var n=e.children;return r.createElement(r.Fragment,{},n)}},u=r.forwardRef((function(e,n){var t=e.components,i=e.mdxType,a=e.originalType,l=e.parentName,m=p(e,["components","mdxType","originalType","parentName"]),u=s(t),c=i,y=u["".concat(l,".").concat(c)]||u[c]||d[c]||a;return t?r.createElement(y,o(o({ref:n},m),{},{components:t})):r.createElement(y,o({ref:n},m))}));function c(e,n){var t=arguments,i=n&&n.mdxType;if("string"==typeof e||i){var a=t.length,o=new Array(a);o[0]=u;var p={};for(var l in n)hasOwnProperty.call(n,l)&&(p[l]=n[l]);p.originalType=e,p.mdxType="string"==typeof e?e:i,o[1]=p;for(var s=2;s<a;s++)o[s]=t[s];return r.createElement.apply(null,o)}return r.createElement.apply(null,t)}u.displayName="MDXCreateElement"},59310:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>l,contentTitle:()=>o,default:()=>d,frontMatter:()=>a,metadata:()=>p,toc:()=>s});var r=t(58168),i=(t(96540),t(15680));const a={id:"extend-snmp",title:"SNMP\u534f\u8bae\u81ea\u5b9a\u4e49\u76d1\u63a7",sidebar_label:"SNMP\u534f\u8bae\u81ea\u5b9a\u4e49\u76d1\u63a7"},o=void 0,p={unversionedId:"advanced/extend-snmp",id:"version-v1.3.x/advanced/extend-snmp",title:"SNMP\u534f\u8bae\u81ea\u5b9a\u4e49\u76d1\u63a7",description:"\u4ece\u81ea\u5b9a\u4e49\u76d1\u63a7\u4e86\u89e3\u719f\u6089\u4e86\u600e\u4e48\u81ea\u5b9a\u4e49\u7c7b\u578b\uff0c\u6307\u6807\uff0c\u534f\u8bae\u7b49\uff0c\u8fd9\u91cc\u6211\u4eec\u6765\u8be6\u7ec6\u4ecb\u7ecd\u4e0b\u7528 SNMP \u534f\u8bae\u81ea\u5b9a\u4e49\u6307\u6807\u76d1\u63a7\u3002",source:"@site/i18n/zh-cn/docusaurus-plugin-content-docs/version-v1.3.x/advanced/extend-snmp.md",sourceDirName:"advanced",slug:"/advanced/extend-snmp",permalink:"/zh-cn/docs/v1.3.x/advanced/extend-snmp",draft:!1,editUrl:"https://github.com/apache/hertzbeat/edit/master/home/i18n/zh-cn/docusaurus-plugin-content-docs/version-v1.3.x/advanced/extend-snmp.md",tags:[],version:"v1.3.x",frontMatter:{id:"extend-snmp",title:"SNMP\u534f\u8bae\u81ea\u5b9a\u4e49\u76d1\u63a7",sidebar_label:"SNMP\u534f\u8bae\u81ea\u5b9a\u4e49\u76d1\u63a7"},sidebar:"docs",previous:{title:"JMX\u534f\u8bae\u81ea\u5b9a\u4e49\u76d1\u63a7",permalink:"/zh-cn/docs/v1.3.x/advanced/extend-jmx"},next:{title:"\u76d1\u63a7\u6a21\u7248",permalink:"/zh-cn/docs/v1.3.x/template"}},l={},s=[{value:"SNMP\u534f\u8bae\u91c7\u96c6\u6d41\u7a0b",id:"snmp\u534f\u8bae\u91c7\u96c6\u6d41\u7a0b",level:3},{value:"\u6570\u636e\u89e3\u6790\u65b9\u5f0f",id:"\u6570\u636e\u89e3\u6790\u65b9\u5f0f",level:3},{value:"\u81ea\u5b9a\u4e49\u6b65\u9aa4",id:"\u81ea\u5b9a\u4e49\u6b65\u9aa4",level:3},{value:"\u76d1\u63a7\u6a21\u7248YML",id:"\u76d1\u63a7\u6a21\u7248yml",level:3}],m={toc:s};function d(e){let{components:n,...a}=e;return(0,i.yg)("wrapper",(0,r.A)({},m,a,{components:n,mdxType:"MDXLayout"}),(0,i.yg)("blockquote",null,(0,i.yg)("p",{parentName:"blockquote"},"\u4ece",(0,i.yg)("a",{parentName:"p",href:"extend-point"},"\u81ea\u5b9a\u4e49\u76d1\u63a7"),"\u4e86\u89e3\u719f\u6089\u4e86\u600e\u4e48\u81ea\u5b9a\u4e49\u7c7b\u578b\uff0c\u6307\u6807\uff0c\u534f\u8bae\u7b49\uff0c\u8fd9\u91cc\u6211\u4eec\u6765\u8be6\u7ec6\u4ecb\u7ecd\u4e0b\u7528 SNMP \u534f\u8bae\u81ea\u5b9a\u4e49\u6307\u6807\u76d1\u63a7\u3002",(0,i.yg)("br",{parentName:"p"}),"\n","SNMP \u534f\u8bae\u81ea\u5b9a\u4e49\u76d1\u63a7\u53ef\u4ee5\u8ba9\u6211\u4eec\u5f88\u65b9\u4fbf\u7684\u901a\u8fc7\u914d\u7f6e Mib OID\u4fe1\u606f \u5c31\u80fd\u76d1\u63a7\u91c7\u96c6\u5230\u6211\u4eec\u60f3\u76d1\u63a7\u7684OID\u6307\u6807     ")),(0,i.yg)("h3",{id:"snmp\u534f\u8bae\u91c7\u96c6\u6d41\u7a0b"},"SNMP\u534f\u8bae\u91c7\u96c6\u6d41\u7a0b"),(0,i.yg)("p",null,"\u3010",(0,i.yg)("strong",{parentName:"p"},"\u5bf9\u7aef\u5f00\u542fSNMP\u670d\u52a1"),"\u3011->\u3010",(0,i.yg)("strong",{parentName:"p"},"HertzBeat\u76f4\u8fde\u5bf9\u7aefSNMP\u670d\u52a1"),"\u3011->\u3010",(0,i.yg)("strong",{parentName:"p"},"\u6839\u636e\u914d\u7f6e\u6293\u53d6\u5bf9\u7aefOID\u6307\u6807\u4fe1\u606f"),"\u3011->\u3010",(0,i.yg)("strong",{parentName:"p"},"\u6307\u6807\u6570\u636e\u63d0\u53d6"),"\u3011   "),(0,i.yg)("p",null,"\u7531\u6d41\u7a0b\u53ef\u89c1\uff0c\u6211\u4eec\u81ea\u5b9a\u4e49\u4e00\u4e2aSNMP\u534f\u8bae\u7684\u76d1\u63a7\u7c7b\u578b\uff0c\u9700\u8981\u914d\u7f6eSNMP\u8bf7\u6c42\u53c2\u6570\uff0c\u914d\u7f6e\u83b7\u53d6\u54ea\u4e9b\u6307\u6807\uff0c\u914d\u7f6e\u67e5\u8be2OID\u4fe1\u606f\u3002"),(0,i.yg)("h3",{id:"\u6570\u636e\u89e3\u6790\u65b9\u5f0f"},"\u6570\u636e\u89e3\u6790\u65b9\u5f0f"),(0,i.yg)("p",null,"\u901a\u8fc7\u914d\u7f6e\u76d1\u63a7\u6a21\u7248YML\u7684\u6307\u6807",(0,i.yg)("inlineCode",{parentName:"p"},"field"),", ",(0,i.yg)("inlineCode",{parentName:"p"},"aliasFields"),", ",(0,i.yg)("inlineCode",{parentName:"p"},"snmp")," \u534f\u8bae\u4e0b\u7684 ",(0,i.yg)("inlineCode",{parentName:"p"},"oids"),"\u6765\u6293\u53d6\u5bf9\u7aef\u6307\u5b9a\u7684\u6570\u636e\u5e76\u89e3\u6790\u6620\u5c04\u3002"),(0,i.yg)("h3",{id:"\u81ea\u5b9a\u4e49\u6b65\u9aa4"},"\u81ea\u5b9a\u4e49\u6b65\u9aa4"),(0,i.yg)("p",null,(0,i.yg)("strong",{parentName:"p"},"HertzBeat\u9875\u9762")," -> ",(0,i.yg)("strong",{parentName:"p"},"\u76d1\u63a7\u6a21\u7248\u83dc\u5355")," -> ",(0,i.yg)("strong",{parentName:"p"},"\u65b0\u589e\u76d1\u63a7\u7c7b\u578b")," -> ",(0,i.yg)("strong",{parentName:"p"},"\u914d\u7f6e\u81ea\u5b9a\u4e49\u76d1\u63a7\u6a21\u7248YML")," -> ",(0,i.yg)("strong",{parentName:"p"},"\u70b9\u51fb\u4fdd\u5b58\u5e94\u7528")," -> ",(0,i.yg)("strong",{parentName:"p"},"\u4f7f\u7528\u65b0\u76d1\u63a7\u7c7b\u578b\u6dfb\u52a0\u76d1\u63a7")),(0,i.yg)("p",null,(0,i.yg)("img",{src:t(35008).A,width:"4064",height:"2166"})),(0,i.yg)("hr",null),(0,i.yg)("p",null,"\u4e0b\u9762\u8be6\u7ec6\u4ecb\u7ecd\u4e0b\u6587\u4ef6\u7684\u914d\u7f6e\u7528\u6cd5\uff0c\u8bf7\u6ce8\u610f\u770b\u4f7f\u7528\u6ce8\u91ca\u3002   "),(0,i.yg)("h3",{id:"\u76d1\u63a7\u6a21\u7248yml"},"\u76d1\u63a7\u6a21\u7248YML"),(0,i.yg)("blockquote",null,(0,i.yg)("p",{parentName:"blockquote"},"\u76d1\u63a7\u914d\u7f6e\u5b9a\u4e49\u6587\u4ef6\u7528\u4e8e\u5b9a\u4e49 ",(0,i.yg)("em",{parentName:"p"},"\u76d1\u63a7\u7c7b\u578b\u7684\u540d\u79f0(\u56fd\u9645\u5316), \u8bf7\u6c42\u53c2\u6570\u7ed3\u6784\u5b9a\u4e49(\u524d\u7aef\u9875\u9762\u6839\u636e\u914d\u7f6e\u81ea\u52a8\u6e32\u67d3UI), \u91c7\u96c6\u6307\u6807\u4fe1\u606f, \u91c7\u96c6\u534f\u8bae\u914d\u7f6e")," \u7b49\u3002",(0,i.yg)("br",{parentName:"p"}),"\n","\u5373\u6211\u4eec\u901a\u8fc7\u81ea\u5b9a\u4e49\u8fd9\u4e2aYML\uff0c\u914d\u7f6e\u5b9a\u4e49\u4ec0\u4e48\u76d1\u63a7\u7c7b\u578b\uff0c\u524d\u7aef\u9875\u9762\u9700\u8981\u8f93\u5165\u4ec0\u4e48\u53c2\u6570\uff0c\u91c7\u96c6\u54ea\u4e9b\u6027\u80fd\u6307\u6807\uff0c\u901a\u8fc7\u4ec0\u4e48\u534f\u8bae\u53bb\u91c7\u96c6\u3002")),(0,i.yg)("p",null,"\u6837\u4f8b\uff1a\u81ea\u5b9a\u4e49\u4e00\u4e2a\u540d\u79f0\u4e3a example_windows \u7684\u81ea\u5b9a\u4e49\u76d1\u63a7\u7c7b\u578b\uff0c\u5176\u4f7f\u7528 SNMP \u534f\u8bae\u91c7\u96c6\u6307\u6807\u6570\u636e\u3002    "),(0,i.yg)("pre",null,(0,i.yg)("code",{parentName:"pre",className:"language-yaml"},"# The monitoring type category\uff1aservice-application service monitoring db-database monitoring mid-middleware custom-custom monitoring os-operating system monitoring\n# \u76d1\u63a7\u7c7b\u578b\u6240\u5c5e\u7c7b\u522b\uff1aservice-\u5e94\u7528\u670d\u52a1 program-\u5e94\u7528\u7a0b\u5e8f db-\u6570\u636e\u5e93 custom-\u81ea\u5b9a\u4e49 os-\u64cd\u4f5c\u7cfb\u7edf bigdata-\u5927\u6570\u636e mid-\u4e2d\u95f4\u4ef6 webserver-web\u670d\u52a1\u5668 cache-\u7f13\u5b58 cn-\u4e91\u539f\u751f network-\u7f51\u7edc\u76d1\u63a7\u7b49\u7b49\ncategory: os\n# The monitoring type eg: linux windows tomcat mysql aws...\n# \u76d1\u63a7\u7c7b\u578b eg: linux windows tomcat mysql aws...\napp: windows\n# The monitoring i18n name\n# \u76d1\u63a7\u7c7b\u578b\u56fd\u9645\u5316\u540d\u79f0\nname:\n  zh-CN: Windows\u64cd\u4f5c\u7cfb\u7edf\n  en-US: OS Windows\n# \u76d1\u63a7\u6240\u9700\u8f93\u5165\u53c2\u6570\u5b9a\u4e49(\u6839\u636e\u5b9a\u4e49\u6e32\u67d3\u9875\u9762UI)\n# Input params define for monitoring(render web ui by the definition)\nparams:\n  # field-param field key\n  # field-\u53d8\u91cf\u5b57\u6bb5\u6807\u8bc6\u7b26\n  - field: host\n    # name-param field display i18n name\n    # name-\u53c2\u6570\u5b57\u6bb5\u663e\u793a\u540d\u79f0\n    name:\n      zh-CN: \u4e3b\u673aHost\n      en-US: Host\n    # type-param field type(most mapping the html input type)\n    # type-\u5b57\u6bb5\u7c7b\u578b,\u6837\u5f0f(\u5927\u90e8\u5206\u6620\u5c04input\u6807\u7b7etype\u5c5e\u6027)\n    type: host\n    # required-true or false\n    # required-\u662f\u5426\u662f\u5fc5\u8f93\u9879 true-\u5fc5\u586b false-\u53ef\u9009\n    required: true\n  # field-param field key\n  # field-\u53d8\u91cf\u5b57\u6bb5\u6807\u8bc6\u7b26\n  - field: port\n    # name-param field display i18n name\n    # name-\u53c2\u6570\u5b57\u6bb5\u663e\u793a\u540d\u79f0\n    name:\n      zh-CN: \u7aef\u53e3\n      en-US: Port\n    # type-param field type(most mapping the html input type)\n    # type-\u5b57\u6bb5\u7c7b\u578b,\u6837\u5f0f(\u5927\u90e8\u5206\u6620\u5c04input\u6807\u7b7etype\u5c5e\u6027)\n    type: number\n    # when type is number, range is required\n    # \u5f53type\u4e3anumber\u65f6,\u7528range\u8868\u793a\u8303\u56f4\n    range: '[0,65535]'\n    # required-true or false\n    # required-\u662f\u5426\u662f\u5fc5\u8f93\u9879 true-\u5fc5\u586b false-\u53ef\u9009\n    required: true\n    # default value\n    # \u9ed8\u8ba4\u503c\n    defaultValue: 161\n  # field-param field key\n  # field-\u53d8\u91cf\u5b57\u6bb5\u6807\u8bc6\u7b26\n  - field: version\n    # name-param field display i18n name\n    # name-\u53c2\u6570\u5b57\u6bb5\u663e\u793a\u540d\u79f0\n    name:\n      zh-CN: SNMP \u7248\u672c\n      en-US: SNMP Version\n    # type-param field type(radio mapping the html radio tag)\n    # type-\u5f53type\u4e3aradio\u65f6,\u524d\u7aef\u7528radio\u5c55\u793a\u5f00\u5173\n    type: radio\n    # required-true or false\n    # required-\u662f\u5426\u662f\u5fc5\u8f93\u9879 true-\u5fc5\u586b false-\u53ef\u9009\n    required: true\n    # when type is radio checkbox, use option to show optional values {name1:value1,name2:value2}\n    # \u5f53type\u4e3aradio\u5355\u9009\u6846, checkbox\u590d\u9009\u6846\u65f6, option\u8868\u793a\u53ef\u9009\u9879\u503c\u5217\u8868 {name1:value1,name2:value2}\n    options:\n      - label: SNMPv1\n        value: 0\n      - label: SNMPv2c\n        value: 1\n  # field-param field key\n  # field-\u53d8\u91cf\u5b57\u6bb5\u6807\u8bc6\u7b26\n  - field: community\n    # name-param field display i18n name\n    # name-\u53c2\u6570\u5b57\u6bb5\u663e\u793a\u540d\u79f0\n    name:\n      zh-CN: SNMP \u56e2\u4f53\u5b57\n      en-US: SNMP Community\n    # type-param field type(most mapping the html input type)\n    # type-\u5b57\u6bb5\u7c7b\u578b,\u6837\u5f0f(\u5927\u90e8\u5206\u6620\u5c04input\u6807\u7b7etype\u5c5e\u6027)\n    type: text\n    # when type is text, use limit to limit string length\n    # \u5f53type\u4e3atext\u65f6,\u7528limit\u8868\u793a\u5b57\u7b26\u4e32\u9650\u5236\u5927\u5c0f\n    limit: 100\n    # required-true or false\n    # required-\u662f\u5426\u662f\u5fc5\u8f93\u9879 true-\u5fc5\u586b false-\u53ef\u9009\n    required: true\n    # \u53c2\u6570\u8f93\u5165\u6846\u63d0\u793a\u4fe1\u606f\n    # param field input placeholder\n    placeholder: 'Snmp community for v1 v2c'\n  # field-param field key\n  # field-\u53d8\u91cf\u5b57\u6bb5\u6807\u8bc6\u7b26\n  - field: timeout\n    # name-param field display i18n name\n    # name-\u53c2\u6570\u5b57\u6bb5\u663e\u793a\u540d\u79f0\n    name:\n      zh-CN: \u8d85\u65f6\u65f6\u95f4(ms)\n      en-US: Timeout(ms)\n    # type-param field type(most mapping the html input type)\n    # type-\u5b57\u6bb5\u7c7b\u578b,\u6837\u5f0f(\u5927\u90e8\u5206\u6620\u5c04input\u6807\u7b7etype\u5c5e\u6027)\n    type: number\n    # when type is number, range is required\n    # \u5f53type\u4e3anumber\u65f6,\u7528range\u8868\u793a\u8303\u56f4\n    range: '[0,100000]'\n    # required-true or false\n    # required-\u662f\u5426\u662f\u5fc5\u8f93\u9879 true-\u5fc5\u586b false-\u53ef\u9009\n    required: false\n    # hide-is hide this field and put it in advanced layout\n    # hide-\u662f\u5426\u9690\u85cf\u6b64\u53c2\u6570\u5c06\u5176\u653e\u5165\u9ad8\u7ea7\u8bbe\u7f6e\u4e2d\n    hide: true\n    # default value\n    # \u9ed8\u8ba4\u503c\n    defaultValue: 6000\n# collect metrics config list\n# \u91c7\u96c6\u6307\u6807\u914d\u7f6e\u5217\u8868\nmetrics:\n  # metrics - system\n  # \u76d1\u63a7\u6307\u6807 - system\n  - name: system\n    # metrics scheduling priority(0->127)->(high->low), metrics with the same priority will be scheduled in parallel\n    # priority 0's metrics is availability metrics, it will be scheduled first, only availability metrics collect success will the scheduling continue\n    # \u6307\u6807\u91c7\u96c6\u8c03\u5ea6\u4f18\u5148\u7ea7(0->127)->(\u4f18\u5148\u7ea7\u9ad8->\u4f4e) \u4f18\u5148\u7ea7\u4f4e\u7684\u6307\u6807\u4f1a\u7b49\u4f18\u5148\u7ea7\u9ad8\u7684\u6307\u6807\u91c7\u96c6\u5b8c\u6210\u540e\u624d\u4f1a\u88ab\u8c03\u5ea6, \u76f8\u540c\u4f18\u5148\u7ea7\u7684\u6307\u6807\u4f1a\u5e76\u884c\u8c03\u5ea6\u91c7\u96c6\n    # \u4f18\u5148\u7ea7\u4e3a0\u7684\u6307\u6807\u4e3a\u53ef\u7528\u6027\u6307\u6807,\u5373\u5b83\u4f1a\u88ab\u9996\u5148\u8c03\u5ea6,\u91c7\u96c6\u6210\u529f\u624d\u4f1a\u7ee7\u7eed\u8c03\u5ea6\u5176\u5b83\u6307\u6807,\u91c7\u96c6\u5931\u8d25\u5219\u4e2d\u65ad\u8c03\u5ea6\n    priority: 0\n    # collect metrics content\n    # \u5177\u4f53\u76d1\u63a7\u6307\u6807\u5217\u8868\n    fields:\n      # field-metric name, type-metric type(0-number,1-string), unit-metric unit('%','ms','MB'), label-if is metrics label\n      # field-\u6307\u6807\u540d\u79f0, type-\u6307\u6807\u7c7b\u578b(0-number\u6570\u5b57,1-string\u5b57\u7b26\u4e32), unit-\u6307\u6807\u5355\u4f4d('%','ms','MB'), instance-\u662f\u5426\u662f\u6307\u6807\u96c6\u5408\u552f\u4e00\u6807\u8bc6\u7b26\u5b57\u6bb5\n      - field: name\n        type: 1\n      - field: descr\n        type: 1\n      - field: uptime\n        type: 1\n      - field: numUsers\n        type: 0\n      - field: services\n        type: 0\n      - field: processes\n        type: 0\n      - field: responseTime\n        type: 0\n        unit: ms\n      - field: location\n        type: 1\n    # the protocol used for monitoring, eg: sql, ssh, http, telnet, wmi, snmp, sdk\n    protocol: snmp\n    # the config content when protocol is snmp\n    snmp:\n      # server host: ipv4 ipv6 domain\n      host: ^_^host^_^\n      # server port\n      port: ^_^port^_^\n      # snmp connect timeout\n      timeout: ^_^timeout^_^\n      # snmp community\n      # snmp \u56e2\u4f53\u5b57\n      community: ^_^community^_^\n      # snmp version\n      version: ^_^version^_^\n      # snmp operation: get, walk\n      operation: get\n      # metrics oids: metric_name - oid_value\n      oids:\n        name: 1.3.6.1.2.1.1.5.0\n        descr: 1.3.6.1.2.1.1.1.0\n        uptime: 1.3.6.1.2.1.25.1.1.0\n        numUsers: 1.3.6.1.2.1.25.1.5.0\n        services: 1.3.6.1.2.1.1.7.0\n        processes: 1.3.6.1.2.1.25.1.6.0\n        location: 1.3.6.1.2.1.1.6.0\n")))}d.isMDXComponent=!0},35008:(e,n,t)=>{t.d(n,{A:()=>r});const r=t.p+"assets/images/extend-point-1-0175fbb6d4bd1105c2596f7ccae83938.png"}}]);