"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[68712],{15680:(e,t,n)=>{n.d(t,{xA:()=>s,yg:()=>u});var r=n(96540);function a(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function l(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function i(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?l(Object(n),!0).forEach((function(t){a(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):l(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function o(e,t){if(null==e)return{};var n,r,a=function(e,t){if(null==e)return{};var n,r,a={},l=Object.keys(e);for(r=0;r<l.length;r++)n=l[r],t.indexOf(n)>=0||(a[n]=e[n]);return a}(e,t);if(Object.getOwnPropertySymbols){var l=Object.getOwnPropertySymbols(e);for(r=0;r<l.length;r++)n=l[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(a[n]=e[n])}return a}var c=r.createContext({}),p=function(e){var t=r.useContext(c),n=t;return e&&(n="function"==typeof e?e(t):i(i({},t),e)),n},s=function(e){var t=p(e.components);return r.createElement(c.Provider,{value:t},e.children)},m={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},g=r.forwardRef((function(e,t){var n=e.components,a=e.mdxType,l=e.originalType,c=e.parentName,s=o(e,["components","mdxType","originalType","parentName"]),g=p(n),u=a,y=g["".concat(c,".").concat(u)]||g[u]||m[u]||l;return n?r.createElement(y,i(i({ref:t},s),{},{components:n})):r.createElement(y,i({ref:t},s))}));function u(e,t){var n=arguments,a=t&&t.mdxType;if("string"==typeof e||a){var l=n.length,i=new Array(l);i[0]=g;var o={};for(var c in t)hasOwnProperty.call(t,c)&&(o[c]=t[c]);o.originalType=e,o.mdxType="string"==typeof e?e:a,i[1]=o;for(var p=2;p<l;p++)i[p]=n[p];return r.createElement.apply(null,i)}return r.createElement.apply(null,n)}g.displayName="MDXCreateElement"},97365:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>c,contentTitle:()=>i,default:()=>m,frontMatter:()=>l,metadata:()=>o,toc:()=>p});var r=n(58168),a=(n(96540),n(15680));const l={id:"custom-config",title:"\u5e38\u89c1\u53c2\u6570\u914d\u7f6e",sidebar_label:"\u5e38\u89c1\u53c2\u6570\u914d\u7f6e"},i=void 0,o={unversionedId:"start/custom-config",id:"start/custom-config",title:"\u5e38\u89c1\u53c2\u6570\u914d\u7f6e",description:"\u8fd9\u91cc\u63cf\u8ff0\u4e86\u5982\u4f55\u914d\u7f6e\u77ed\u4fe1\u670d\u52a1\uff0c\u5185\u7f6e\u53ef\u7528\u6027\u544a\u8b66\u89e6\u53d1\u6b21\u6570\u7b49\u3002",source:"@site/i18n/zh-cn/docusaurus-plugin-content-docs/current/start/custom-config.md",sourceDirName:"start",slug:"/start/custom-config",permalink:"/zh-cn/docs/start/custom-config",draft:!1,editUrl:"https://github.com/apache/hertzbeat/edit/master/home/i18n/zh-cn/docusaurus-plugin-content-docs/current/start/custom-config.md",tags:[],version:"current",frontMatter:{id:"custom-config",title:"\u5e38\u89c1\u53c2\u6570\u914d\u7f6e",sidebar_label:"\u5e38\u89c1\u53c2\u6570\u914d\u7f6e"},sidebar:"docs",previous:{title:"\u66f4\u65b0\u8d26\u6237\u548c\u5bc6\u94a5",permalink:"/zh-cn/docs/start/account-modify"},next:{title:"\u6307\u6807\u6570\u636e\u5b58\u50a8VictoriaMetrics(\u63a8\u8350)",permalink:"/zh-cn/docs/start/victoria-metrics-init"}},c={},p=[{value:"1. \u914d\u7f6e\u77ed\u4fe1\u53d1\u9001\u670d\u52a1",id:"1-\u914d\u7f6e\u77ed\u4fe1\u53d1\u9001\u670d\u52a1",level:2},{value:"1.1 \u817e\u8baf\u4e91\u77ed\u4fe1\u914d\u7f6e",id:"11-\u817e\u8baf\u4e91\u77ed\u4fe1\u914d\u7f6e",level:3},{value:"2. \u914d\u7f6e\u544a\u8b66\u81ea\u5b9a\u4e49\u53c2\u6570",id:"2-\u914d\u7f6e\u544a\u8b66\u81ea\u5b9a\u4e49\u53c2\u6570",level:2},{value:"3. \u4f7f\u7528\u5916\u7f6eredis\u4ee3\u66ff\u5185\u5b58\u5b58\u50a8\u5b9e\u65f6\u6307\u6807\u6570\u636e",id:"3-\u4f7f\u7528\u5916\u7f6eredis\u4ee3\u66ff\u5185\u5b58\u5b58\u50a8\u5b9e\u65f6\u6307\u6807\u6570\u636e",level:2}],s={toc:p};function m(e){let{components:t,...n}=e;return(0,a.yg)("wrapper",(0,r.A)({},s,n,{components:t,mdxType:"MDXLayout"}),(0,a.yg)("p",null,"\u8fd9\u91cc\u63cf\u8ff0\u4e86\u5982\u4f55\u914d\u7f6e\u77ed\u4fe1\u670d\u52a1\uff0c\u5185\u7f6e\u53ef\u7528\u6027\u544a\u8b66\u89e6\u53d1\u6b21\u6570\u7b49\u3002"),(0,a.yg)("p",null,(0,a.yg)("strong",{parentName:"p"},(0,a.yg)("inlineCode",{parentName:"strong"},"hertzbeat"),"\u7684\u914d\u7f6e\u6587\u4ef6",(0,a.yg)("inlineCode",{parentName:"strong"},"application.yml"))),(0,a.yg)("p",null,"\u914d\u7f6eHertzBeat\u7684\u914d\u7f6e\u6587\u4ef6"),(0,a.yg)("ul",null,(0,a.yg)("li",{parentName:"ul"},"\u4fee\u6539\u4f4d\u4e8e ",(0,a.yg)("inlineCode",{parentName:"li"},"hertzbeat/config/application.yml")," \u7684\u914d\u7f6e\u6587\u4ef6"),(0,a.yg)("li",{parentName:"ul"},(0,a.yg)("strong",{parentName:"li"},"Docker\u90e8\u7f72\uff1a")," \u26a0\ufe0fdocker\u5bb9\u5668\u65b9\u5f0f\u9700\u8981\u5c06 ",(0,a.yg)("inlineCode",{parentName:"li"},"application.yml")," \u6587\u4ef6\u6302\u8f7d\u5230\u4e3b\u673a\u672c\u5730"),(0,a.yg)("li",{parentName:"ul"},(0,a.yg)("strong",{parentName:"li"},"\u5b89\u88c5\u5305\u65b9\u5f0f\uff1a")," \u89e3\u538b\u4fee\u6539\u4f4d\u4e8e ",(0,a.yg)("inlineCode",{parentName:"li"},"hertzbeat/config/application.yml")," \u7684\u914d\u7f6e\u6587\u4ef6\u5373\u53ef")),(0,a.yg)("h2",{id:"1-\u914d\u7f6e\u77ed\u4fe1\u53d1\u9001\u670d\u52a1"},"1. \u914d\u7f6e\u77ed\u4fe1\u53d1\u9001\u670d\u52a1"),(0,a.yg)("p",null,"\u53ea\u6709\u6210\u529f\u914d\u7f6e\u4e86\u60a8\u81ea\u5df1\u7684\u77ed\u4fe1\u670d\u52a1\uff0c\u76d1\u63a7\u7cfb\u7edf\u5185\u89e6\u53d1\u7684\u544a\u8b66\u77ed\u4fe1\u624d\u4f1a\u6b63\u5e38\u53d1\u9001\u3002\nhertzbeat\u6709\u4e24\u79cd\u65b9\u5f0f\u914d\u7f6e\u77ed\u4fe1\u670d\u52a1\uff0c\u4e00\u79cd\u662f\u76f4\u63a5\u4fee\u6539",(0,a.yg)("inlineCode",{parentName:"p"},"application.yml"),"\u914d\u7f6e\u6587\u4ef6\uff0c\u53e6\u4e00\u79cd\u662f\u901a\u8fc7hertzbeat\u524d\u7aef\u754c\u9762\uff08\u7cfb\u7edf\u8bbe\u7f6e > \u6d88\u606f\u670d\u52a1\u914d\u7f6e\uff09\u914d\u7f6e\u3002"),(0,a.yg)("blockquote",null,(0,a.yg)("p",{parentName:"blockquote"},"\u6ce8\u610f\u26a0\ufe0f:\u4e24\u79cd\u65b9\u5f0f\u914d\u7f6e\u7684\u77ed\u4fe1\u670d\u52a1\u53ea\u80fd\u9009\u62e9\u4e00\u79cd\u751f\u6548\uff0c\u5f53\u4e24\u79cd\u65b9\u5f0f\u90fd\u914d\u7f6e\u5e76\u4e14\u5f00\u542f\u65f6\uff0chertzbeat\u5c06\u4f1a\u4f18\u5148\u4f7f\u7528\u524d\u7aef\u754c\u9762\u914d\u7f6e\u7684\u77ed\u4fe1\u670d\u52a1\u3002")),(0,a.yg)("h3",{id:"11-\u817e\u8baf\u4e91\u77ed\u4fe1\u914d\u7f6e"},"1.1 \u817e\u8baf\u4e91\u77ed\u4fe1\u914d\u7f6e"),(0,a.yg)("p",null,"\u5728",(0,a.yg)("inlineCode",{parentName:"p"},"application.yml"),"\u65b0\u589e\u5982\u4e0b\u817e\u8baf\u5e73\u53f0\u77ed\u4fe1\u670d\u52a1\u5668\u914d\u7f6e(\u53c2\u6570\u9700\u66ff\u6362\u4e3a\u60a8\u7684\u77ed\u4fe1\u670d\u52a1\u5668\u914d\u7f6e)"),(0,a.yg)("pre",null,(0,a.yg)("code",{parentName:"pre",className:"language-yaml"},"alerter:\n  sms:\n    enable: true     # \u662f\u5426\u542f\u7528\n    type: tencent    # \u77ed\u4fe1\u670d\u52a1\u5546\u7c7b\u578b\uff0c\u652f\u6301tencent\u3001\n    tencent:         # \u817e\u8baf\u4e91\u77ed\u4fe1\u914d\u7f6e\n      secret-id: AKIDbQ4VhdMr89wDedFrIcgU2PaaMvOuBCzY\n      secret-key: PaXGl0ziY9UcWFjUyiFlCPMr77rLkJYlyA\n      app-id: 1435441637\n      sign-name: \u8d6b\u5179\u8df3\u52a8\n      template-id: 1343434\n")),(0,a.yg)("ol",null,(0,a.yg)("li",{parentName:"ol"},(0,a.yg)("p",{parentName:"li"},"\u817e\u8baf\u4e91\u77ed\u4fe1\u521b\u5efa\u7b7e\u540d\uff08sign-name\uff09\n",(0,a.yg)("img",{parentName:"p",src:"https://github.com/apache/hertzbeat/assets/40455946/3a4c287d-b23d-4398-8562-4894296af485",alt:"image"}))),(0,a.yg)("li",{parentName:"ol"},(0,a.yg)("p",{parentName:"li"},"\u817e\u8baf\u4e91\u77ed\u4fe1\u521b\u5efa\u6b63\u6587\u6a21\u677f\uff08template-id\uff09"),(0,a.yg)("pre",{parentName:"li"},(0,a.yg)("code",{parentName:"pre",className:"language-text"},"\u76d1\u63a7:{1}\uff0c\u544a\u8b66\u7ea7\u522b:{2}\u3002\u5185\u5bb9:{3}\n")),(0,a.yg)("p",{parentName:"li"},(0,a.yg)("img",{parentName:"p",src:"https://github.com/apache/hertzbeat/assets/40455946/face71a6-46d5-452c-bed3-59d2a975afeb",alt:"image"}))),(0,a.yg)("li",{parentName:"ol"},(0,a.yg)("p",{parentName:"li"},"\u817e\u8baf\u4e91\u77ed\u4fe1\u521b\u5efa\u5e94\u7528\uff08app-id\uff09\n",(0,a.yg)("img",{parentName:"p",src:"https://github.com/apache/hertzbeat/assets/40455946/2732d710-37fa-4455-af64-48bba273c2f8",alt:"image"}))),(0,a.yg)("li",{parentName:"ol"},(0,a.yg)("p",{parentName:"li"},"\u817e\u8baf\u4e91\u8bbf\u95ee\u7ba1\u7406\uff08secret-id\u3001secret-key\uff09\n",(0,a.yg)("img",{parentName:"p",src:"https://github.com/apache/hertzbeat/assets/40455946/36f056f0-94e7-43db-8f07-82893c98024e",alt:"image"})))),(0,a.yg)("h2",{id:"2-\u914d\u7f6e\u544a\u8b66\u81ea\u5b9a\u4e49\u53c2\u6570"},"2. \u914d\u7f6e\u544a\u8b66\u81ea\u5b9a\u4e49\u53c2\u6570"),(0,a.yg)("pre",null,(0,a.yg)("code",{parentName:"pre",className:"language-yaml"},"alerter:\n  # \u81ea\u5b9a\u4e49\u63a7\u5236\u53f0\u5730\u5740\n  console-url: https://console.tancloud.io\n")),(0,a.yg)("h2",{id:"3-\u4f7f\u7528\u5916\u7f6eredis\u4ee3\u66ff\u5185\u5b58\u5b58\u50a8\u5b9e\u65f6\u6307\u6807\u6570\u636e"},"3. \u4f7f\u7528\u5916\u7f6eredis\u4ee3\u66ff\u5185\u5b58\u5b58\u50a8\u5b9e\u65f6\u6307\u6807\u6570\u636e"),(0,a.yg)("blockquote",null,(0,a.yg)("p",{parentName:"blockquote"},"\u9ed8\u8ba4\u6211\u4eec\u7684\u6307\u6807\u5b9e\u65f6\u6570\u636e\u5b58\u50a8\u5728\u5185\u5b58\u4e2d\uff0c\u53ef\u4ee5\u914d\u7f6e\u5982\u4e0b\u6765\u4f7f\u7528redis\u4ee3\u66ff\u5185\u5b58\u5b58\u50a8\u3002")),(0,a.yg)("p",null,"\u6ce8\u610f\u26a0\ufe0f ",(0,a.yg)("inlineCode",{parentName:"p"},"memory.enabled: false, redis.enabled: true")),(0,a.yg)("pre",null,(0,a.yg)("code",{parentName:"pre",className:"language-yaml"},"warehouse:\n  store:\n    memory:\n      enabled: false\n      init-size: 1024\n    redis:\n      enabled: true\n      host: 127.0.0.1\n      port: 6379\n      password: 123456\n")))}m.isMDXComponent=!0}}]);