"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[89190],{15680:(e,t,n)=>{n.d(t,{xA:()=>c,yg:()=>m});var a=n(96540);function r(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function s(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,a)}return n}function i(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?s(Object(n),!0).forEach((function(t){r(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):s(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function o(e,t){if(null==e)return{};var n,a,r=function(e,t){if(null==e)return{};var n,a,r={},s=Object.keys(e);for(a=0;a<s.length;a++)n=s[a],t.indexOf(n)>=0||(r[n]=e[n]);return r}(e,t);if(Object.getOwnPropertySymbols){var s=Object.getOwnPropertySymbols(e);for(a=0;a<s.length;a++)n=s[a],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(r[n]=e[n])}return r}var p=a.createContext({}),u=function(e){var t=a.useContext(p),n=t;return e&&(n="function"==typeof e?e(t):i(i({},t),e)),n},c=function(e){var t=u(e.components);return a.createElement(p.Provider,{value:t},e.children)},d={inlineCode:"code",wrapper:function(e){var t=e.children;return a.createElement(a.Fragment,{},t)}},l=a.forwardRef((function(e,t){var n=e.components,r=e.mdxType,s=e.originalType,p=e.parentName,c=o(e,["components","mdxType","originalType","parentName"]),l=u(n),m=r,g=l["".concat(p,".").concat(m)]||l[m]||d[m]||s;return n?a.createElement(g,i(i({ref:t},c),{},{components:n})):a.createElement(g,i({ref:t},c))}));function m(e,t){var n=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var s=n.length,i=new Array(s);i[0]=l;var o={};for(var p in t)hasOwnProperty.call(t,p)&&(o[p]=t[p]);o.originalType=e,o.mdxType="string"==typeof e?e:r,i[1]=o;for(var u=2;u<s;u++)i[u]=n[u];return a.createElement.apply(null,i)}return a.createElement.apply(null,n)}l.displayName="MDXCreateElement"},41852:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>p,contentTitle:()=>i,default:()=>d,frontMatter:()=>s,metadata:()=>o,toc:()=>u});var a=n(58168),r=(n(96540),n(15680));const s={id:"account-modify",title:"Modify Account Username Password And Secret",sidebar_label:"Update Account Secret"},i=void 0,o={unversionedId:"start/account-modify",id:"start/account-modify",title:"Modify Account Username Password And Secret",description:"Update Account",source:"@site/docs/start/account-modify.md",sourceDirName:"start",slug:"/start/account-modify",permalink:"/docs/start/account-modify",draft:!1,editUrl:"https://github.com/apache/hertzbeat/edit/master/home/docs/start/account-modify.md",tags:[],version:"current",frontMatter:{id:"account-modify",title:"Modify Account Username Password And Secret",sidebar_label:"Update Account Secret"},sidebar:"docs",previous:{title:"Install via Rainbond",permalink:"/docs/start/rainbond-deploy"},next:{title:"Version Upgrade Guide",permalink:"/docs/start/upgrade"}},p={},u=[{value:"Update Account",id:"update-account",level:2},{value:"Update Security Secret",id:"update-security-secret",level:2}],c={toc:u};function d(e){let{components:t,...n}=e;return(0,r.yg)("wrapper",(0,a.A)({},c,n,{components:t,mdxType:"MDXLayout"}),(0,r.yg)("h2",{id:"update-account"},"Update Account"),(0,r.yg)("p",null,"Apache HertzBeat (incubating) default built-in three user accounts, respectively admin/hertzbeat tom/hertzbeat guest/hertzbeat",(0,r.yg)("br",{parentName:"p"}),"\n","If you need add, delete or modify account or password, configure ",(0,r.yg)("inlineCode",{parentName:"p"},"sureness.yml"),". Ignore this step without this demand.",(0,r.yg)("br",{parentName:"p"}),"\n","Modify the following ",(0,r.yg)("strong",{parentName:"p"},"part parameters")," in sureness.yml\uff1a",(0,r.yg)("strong",{parentName:"p"},"[Note\u26a0\ufe0fOther default sureness configuration parameters should be retained]")),(0,r.yg)("pre",null,(0,r.yg)("code",{parentName:"pre",className:"language-yaml"},"\nresourceRole:\n  - /api/account/auth/refresh===post===[admin,user,guest]\n  - /api/apps/**===get===[admin,user,guest]\n  - /api/monitor/**===get===[admin,user,guest]\n  - /api/monitor/**===post===[admin,user]\n  - /api/monitor/**===put===[admin,user]\n  - /api/monitor/**===delete==[admin]\n  - /api/monitors/**===get===[admin,user,guest]\n  - /api/monitors/**===post===[admin,user]\n  - /api/monitors/**===put===[admin,user]\n  - /api/monitors/**===delete===[admin]\n  - /api/alert/**===get===[admin,user,guest]\n  - /api/alert/**===post===[admin,user]\n  - /api/alert/**===put===[admin,user]\n  - /api/alert/**===delete===[admin]\n  - /api/alerts/**===get===[admin,user,guest]\n  - /api/alerts/**===post===[admin,user]\n  - /api/alerts/**===put===[admin,user]\n  - /api/alerts/**===delete===[admin]\n  - /api/notice/**===get===[admin,user,guest]\n  - /api/notice/**===post===[admin,user]\n  - /api/notice/**===put===[admin,user]\n  - /api/notice/**===delete===[admin]\n  - /api/tag/**===get===[admin,user,guest]\n  - /api/tag/**===post===[admin,user]\n  - /api/tag/**===put===[admin,user]\n  - /api/tag/**===delete===[admin]\n  - /api/summary/**===get===[admin,user,guest]\n  - /api/summary/**===post===[admin,user]\n  - /api/summary/**===put===[admin,user]\n  - /api/summary/**===delete===[admin]\n  - /api/collector/**===get===[admin,user,guest]\n  - /api/collector/**===post===[admin,user]\n  - /api/collector/**===put===[admin,user]\n  - /api/collector/**===delete===[admin]\n  - /api/status/page/**===get===[admin,user,guest]\n  - /api/status/page/**===post===[admin,user]\n  - /api/status/page/**===put===[admin,user]\n  - /api/status/page/**===delete===[admin]\n\n# config the resource restful api that need bypass auth protection\n# rule: api===method \n# eg: /api/v1/source3===get means /api/v1/source3===get can be access by anyone, no need auth.\nexcludedResource:\n  - /api/alerts/report/**===*\n  - /api/account/auth/**===*\n  - /api/i18n/**===get\n  - /api/apps/hierarchy===get\n  - /api/push/**===*\n  - /api/status/page/public/**===*\n  # web ui resource\n  - /===get\n  - /dashboard/**===get\n  - /monitors/**===get\n  - /alert/**===get\n  - /account/**===get\n  - /setting/**===get\n  - /passport/**===get\n  - /status/**===get\n  - /**/*.html===get\n  - /**/*.js===get\n  - /**/*.css===get\n  - /**/*.ico===get\n  - /**/*.ttf===get\n  - /**/*.png===get\n  - /**/*.gif===get\n  - /**/*.jpg===get\n  - /**/*.svg===get\n  - /**/*.json===get\n  - /**/*.woff===get\n  - /**/*.eot===get\n  # swagger ui resource\n  - /swagger-resources/**===get\n  - /v2/api-docs===get\n  - /v3/api-docs===get\n  # h2 database\n  - /h2-console/**===*\n\n# account info config\n# eg: admin has role [admin,user], password is hertzbeat\n# eg: tom has role [user], password is hertzbeat\n# eg: lili has role [guest], plain password is lili, salt is 123, salted password is 1A676730B0C7F54654B0E09184448289\naccount:\n  - appId: admin\n    credential: hertzbeat\n    role: [admin]\n  - appId: tom\n    credential: hertzbeat\n    role: [user]\n  - appId: guest\n    credential: hertzbeat\n    role: [guest]\n  - appId: lili\n    # credential = MD5(password + salt)\n    # plain password: hertzbeat\n    # attention: digest authentication does not support salted encrypted password accounts\n    credential: 94C6B34E7A199A9F9D4E1F208093B489\n    salt: 123\n    role: [user]\n")),(0,r.yg)("p",null,"Modify the following ",(0,r.yg)("strong",{parentName:"p"},"part parameters")," in sureness.yml ",(0,r.yg)("strong",{parentName:"p"},"[Note\u26a0\ufe0fOther default sureness configuration parameters should be retained]"),"\uff1a"),(0,r.yg)("pre",null,(0,r.yg)("code",{parentName:"pre",className:"language-yaml"},"\n# user account information\n# Here is admin tom lili three accounts\n# eg: admin has role [admin,user], password is hertzbeat\n# eg: tom has role [user], password is hertzbeat\n# eg: lili has role [guest], plain password is lili, salt is 123, salted password is 1A676730B0C7F54654B0E09184448289\naccount:\n  - appId: admin\n    credential: hertzbeat\n    role: [admin]\n  - appId: tom\n    credential: hertzbeat\n    role: [user]\n  - appId: guest\n    credential: hertzbeat\n    role: [guest]\n  - appId: lili\n    # credential = MD5(password + salt)\n    # plain password: hertzbeat\n    # attention: digest authentication does not support salted encrypted password accounts\n    credential: 94C6B34E7A199A9F9D4E1F208093B489\n    salt: 123\n    role: [user]\n")),(0,r.yg)("h2",{id:"update-security-secret"},"Update Security Secret"),(0,r.yg)("blockquote",null,(0,r.yg)("p",{parentName:"blockquote"},"This secret is the key for account security encryption management and needs to be updated to your custom key string of the same length. ")),(0,r.yg)("p",null,"Update the ",(0,r.yg)("inlineCode",{parentName:"p"},"application.yml")," file in the ",(0,r.yg)("inlineCode",{parentName:"p"},"config")," directory, modify the ",(0,r.yg)("inlineCode",{parentName:"p"},"sureness.jwt.secret")," parameter to your custom key string of the same length.  "),(0,r.yg)("pre",null,(0,r.yg)("code",{parentName:"pre",className:"language-yaml"},"sureness:\n  jwt:\n    secret: 'CyaFv0bwq2Eik0jdrKUtsA6bx4sDJeFV643R\n             LnfKefTjsIfJLBa2YkhEqEGtcHDTNe4CU6+9\n             8tVt4bisXQ13rbN0oxhUZR73M6EByXIO+SV5\n             dKhaX0csgOCTlCxq20yhmUea6H6JIpSE2Rwp'\n")),(0,r.yg)("p",null,(0,r.yg)("strong",{parentName:"p"},"Restart HertzBeat, access http://ip:1157/ to explore")))}d.isMDXComponent=!0}}]);