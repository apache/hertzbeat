"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[77256],{15680:(e,t,r)=>{r.d(t,{xA:()=>u,yg:()=>d});var n=r(96540);function a(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function i(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function l(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?i(Object(r),!0).forEach((function(t){a(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):i(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function o(e,t){if(null==e)return{};var r,n,a=function(e,t){if(null==e)return{};var r,n,a={},i=Object.keys(e);for(n=0;n<i.length;n++)r=i[n],t.indexOf(r)>=0||(a[r]=e[r]);return a}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(n=0;n<i.length;n++)r=i[n],t.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(e,r)&&(a[r]=e[r])}return a}var p=n.createContext({}),c=function(e){var t=n.useContext(p),r=t;return e&&(r="function"==typeof e?e(t):l(l({},t),e)),r},u=function(e){var t=c(e.components);return n.createElement(p.Provider,{value:t},e.children)},s={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},y=n.forwardRef((function(e,t){var r=e.components,a=e.mdxType,i=e.originalType,p=e.parentName,u=o(e,["components","mdxType","originalType","parentName"]),y=c(r),d=a,m=y["".concat(p,".").concat(d)]||y[d]||s[d]||i;return r?n.createElement(m,l(l({ref:t},u),{},{components:r})):n.createElement(m,l({ref:t},u))}));function d(e,t){var r=arguments,a=t&&t.mdxType;if("string"==typeof e||a){var i=r.length,l=new Array(i);l[0]=y;var o={};for(var p in t)hasOwnProperty.call(t,p)&&(o[p]=t[p]);o.originalType=e,o.mdxType="string"==typeof e?e:a,l[1]=o;for(var c=2;c<i;c++)l[c]=r[c];return n.createElement.apply(null,l)}return n.createElement.apply(null,r)}y.displayName="MDXCreateElement"},95569:(e,t,r)=>{r.r(t),r.d(t,{assets:()=>p,contentTitle:()=>l,default:()=>s,frontMatter:()=>i,metadata:()=>o,toc:()=>c});var n=r(58168),a=(r(96540),r(15680));const i={id:"security_model",title:"\u5b89\u5168\u6a21\u578b",sidebar_label:"\u5b89\u5168\u6a21\u578b"},l=void 0,o={unversionedId:"help/security_model",id:"version-v1.6.x/help/security_model",title:"\u5b89\u5168\u6a21\u578b",description:"Apache HertzBeat \u662f\u4e00\u4e2a\u9ad8\u53ef\u6269\u5c55\u7684\u7cfb\u7edf\uff0c\u5176\u63d0\u4f9b\u7528\u6237\u5927\u91cf\u7684\u81ea\u5b9a\u4e49\u80fd\u529b\uff0c\u7528\u6237\u53ef\u4ee5\u901a\u8fc7\u81ea\u5b9a\u4e49\u76d1\u63a7\u6a21\u7248\uff0c\u81ea\u5b9a\u4e49\u76d1\u63a7\u5668\uff0c\u81ea\u5b9a\u4e49\u63d2\u4ef6\u7b49\u6765\u5bf9\u5e73\u53f0\u589e\u5f3a\u3002\u5728\u8fd9\u79cd\u60c5\u51b5\u4e0b\uff0c\u5b89\u5168\u6027\u662f\u975e\u5e38\u91cd\u8981\u7684\u3002",source:"@site/i18n/zh-cn/docusaurus-plugin-content-docs/version-v1.6.x/help/security_model.md",sourceDirName:"help",slug:"/help/security_model",permalink:"/zh-cn/docs/v1.6.x/help/security_model",draft:!1,editUrl:"https://github.com/apache/hertzbeat/edit/master/home/i18n/zh-cn/docusaurus-plugin-content-docs/version-v1.6.x/help/security_model.md",tags:[],version:"v1.6.x",frontMatter:{id:"security_model",title:"\u5b89\u5168\u6a21\u578b",sidebar_label:"\u5b89\u5168\u6a21\u578b"},sidebar:"docs",previous:{title:"\u5e2e\u52a9\u5165\u95e8",permalink:"/zh-cn/docs/v1.6.x/help/guide"},next:{title:"Prometheus\u4efb\u52a1\u76d1\u63a7",permalink:"/zh-cn/docs/v1.6.x/help/prometheus"}},p={},c=[{value:"\u7528\u6237\u6743\u9650\u5b89\u5168",id:"\u7528\u6237\u6743\u9650\u5b89\u5168",level:2},{value:"\u76d1\u63a7\u6a21\u7248\u5b89\u5168",id:"\u76d1\u63a7\u6a21\u7248\u5b89\u5168",level:2},{value:"\u81ea\u5b9a\u4e49\u63d2\u4ef6\u5b89\u5168",id:"\u81ea\u5b9a\u4e49\u63d2\u4ef6\u5b89\u5168",level:2},{value:"\u81ea\u5b9a\u4e49\u91c7\u96c6\u5668\u5b89\u5168",id:"\u81ea\u5b9a\u4e49\u91c7\u96c6\u5668\u5b89\u5168",level:2},{value:"\u5176\u5b83\u81ea\u5b9a\u4e49\u4e0b\u7684\u5b89\u5168\u7ea6\u675f",id:"\u5176\u5b83\u81ea\u5b9a\u4e49\u4e0b\u7684\u5b89\u5168\u7ea6\u675f",level:2},{value:"Reporting a Vulnerability",id:"reporting-a-vulnerability",level:2}],u={toc:c};function s(e){let{components:t,...r}=e;return(0,a.yg)("wrapper",(0,n.A)({},u,r,{components:t,mdxType:"MDXLayout"}),(0,a.yg)("admonition",{type:"tip"},(0,a.yg)("p",{parentName:"admonition"},"Apache HertzBeat \u662f\u4e00\u4e2a\u9ad8\u53ef\u6269\u5c55\u7684\u7cfb\u7edf\uff0c\u5176\u63d0\u4f9b\u7528\u6237\u5927\u91cf\u7684\u81ea\u5b9a\u4e49\u80fd\u529b\uff0c\u7528\u6237\u53ef\u4ee5\u901a\u8fc7\u81ea\u5b9a\u4e49\u76d1\u63a7\u6a21\u7248\uff0c\u81ea\u5b9a\u4e49\u76d1\u63a7\u5668\uff0c\u81ea\u5b9a\u4e49\u63d2\u4ef6\u7b49\u6765\u5bf9\u5e73\u53f0\u589e\u5f3a\u3002\u5728\u8fd9\u79cd\u60c5\u51b5\u4e0b\uff0c\u5b89\u5168\u6027\u662f\u975e\u5e38\u91cd\u8981\u7684\u3002",(0,a.yg)("br",{parentName:"p"}),"\n","\u672c\u6587\u6863\u5c06\u4ecb\u7ecd Apache HertzBeat \u7684\u5b89\u5168\u6a21\u578b\u3002",(0,a.yg)("br",{parentName:"p"}),"\n","\u8fd9\u91cc\u7684\u5b89\u5168\u6a21\u578b\u4e3b\u8981\u6d89\u53ca\u7528\u6237\u5728\u6269\u5c55\u8fc7\u7a0b\u4e2d\u9700\u8981\u6ce8\u610f\u7684\u5b89\u5168\u8fb9\u754c\uff0c\u4ee5\u53ca\u5982\u4f55\u4fdd\u8bc1\u7528\u6237\u7684\u81ea\u5b9a\u4e49\u4e0d\u4f1a\u5bf9\u7cfb\u7edf\u9020\u6210\u5b89\u5168\u9690\u60a3\u3002")),(0,a.yg)("h2",{id:"\u7528\u6237\u6743\u9650\u5b89\u5168"},"\u7528\u6237\u6743\u9650\u5b89\u5168"),(0,a.yg)("p",null,"Apache HertzBeat \u4f7f\u7528 ",(0,a.yg)("a",{parentName:"p",href:"https://github.com/dromara/sureness"},"Sureness")," \u6765\u652f\u6491\u7cfb\u7edf\u7528\u6237\u5b89\u5168\u3002"),(0,a.yg)("p",null,"\u4f7f\u7528 Sureness \u63d0\u4f9b\u7684 ",(0,a.yg)("inlineCode",{parentName:"p"},"sureness.yml")," \u6765\u914d\u7f6e\u7528\u6237\u8d26\u6237\uff0c\u89d2\u8272\uff0cAPI\u8d44\u6e90\u7b49\uff0c\u5f3a\u70c8\u5efa\u8bae\u521d\u59cb\u7528\u6237\u4fee\u6539\u8d26\u6237\u5bc6\u7801\uff0c\u5177\u4f53\u53c2\u8003 ",(0,a.yg)("a",{parentName:"p",href:"../start/account-modify"},"\u8d26\u6237\u6743\u9650\u7ba1\u7406")),(0,a.yg)("h2",{id:"\u76d1\u63a7\u6a21\u7248\u5b89\u5168"},"\u76d1\u63a7\u6a21\u7248\u5b89\u5168"),(0,a.yg)("p",null,"Apache HertzBeat \u63d0\u4f9b\u4e86\u76d1\u63a7\u6a21\u7248\u529f\u80fd\uff0c\u7528\u6237\u53ef\u4ee5\u901a\u8fc7\u914d\u7f6e\u76d1\u63a7\u6a21\u7248\u91cc\u9762\u7684\u81ea\u5b9a\u4e49\u811a\u672c\u6765\u5b9a\u4e49\u76d1\u63a7\u89c4\u5219\u3002"),(0,a.yg)("p",null,"\u811a\u672c\u7c7b\u578b\u5305\u542b ",(0,a.yg)("inlineCode",{parentName:"p"},"SQL")," ",(0,a.yg)("inlineCode",{parentName:"p"},"SHELL")," ",(0,a.yg)("inlineCode",{parentName:"p"},"JMX")," ",(0,a.yg)("inlineCode",{parentName:"p"},"URL")," ",(0,a.yg)("inlineCode",{parentName:"p"},"API")," \u7b49\uff0c\u5f53\u7528\u6237\u81ea\u5b9a\u4e49\u811a\u672c\u65f6\u9700\u8981\u81ea\u884c\u4fdd\u8bc1\u81ea\u5b9a\u4e49\u811a\u672c\u7684\u5b89\u5168\u6027\uff0c\u907f\u514d\u811a\u672c\u4e2d\u5305\u542b\u6076\u610f\u4ee3\u7801\u7b49\u3002"),(0,a.yg)("h2",{id:"\u81ea\u5b9a\u4e49\u63d2\u4ef6\u5b89\u5168"},"\u81ea\u5b9a\u4e49\u63d2\u4ef6\u5b89\u5168"),(0,a.yg)("p",null,"Apache HertzBeat \u652f\u6301\u7528\u6237\u4e0a\u4f20\u81ea\u5b9a\u4e49\u4ee3\u7801\u63d2\u4ef6\u5728\u591a\u4e2a\u7cfb\u7edf\u7684\u751f\u547d\u5468\u671f\u4e0b\u8fd0\u884c\uff0c\u7528\u6237\u9700\u8981\u81ea\u884c\u4fdd\u8bc1\u81ea\u5b9a\u4e49\u63d2\u4ef6\u4ee3\u7801\u7684\u5b89\u5168\u6027\u3002"),(0,a.yg)("h2",{id:"\u81ea\u5b9a\u4e49\u91c7\u96c6\u5668\u5b89\u5168"},"\u81ea\u5b9a\u4e49\u91c7\u96c6\u5668\u5b89\u5168"),(0,a.yg)("p",null,"Apache HertzBeat \u652f\u6301\u7528\u6237\u81ea\u5b9a\u4e49\u91c7\u96c6\u5668\u6765\u4e2a\u6027\u5316\u91c7\u96c6\u76d1\u63a7\u6307\u6807\u7b49\uff0c\u7528\u6237\u9700\u8981\u81ea\u884c\u4fdd\u8bc1\u81ea\u5b9a\u4e49\u91c7\u96c6\u5668\u7684\u5b89\u5168\u6027\u3002"),(0,a.yg)("h2",{id:"\u5176\u5b83\u81ea\u5b9a\u4e49\u4e0b\u7684\u5b89\u5168\u7ea6\u675f"},"\u5176\u5b83\u81ea\u5b9a\u4e49\u4e0b\u7684\u5b89\u5168\u7ea6\u675f"),(0,a.yg)("p",null,"Apache HertzBeat \u63d0\u4f9b\u591a\u79cd\u7cfb\u7edf\u6269\u5c55\u65b9\u5f0f\u548c\u81ea\u5b9a\u4e49\u80fd\u529b\uff0c\u7528\u6237\u5728\u4f7f\u7528\u8fc7\u7a0b\u4e2d\u9700\u6ce8\u610f\u81ea\u5b9a\u4e49\u7684\u5b89\u5168\u6027\u3002\u5f53\u7136\u6240\u6709\u6269\u5c55\u80fd\u529b\u90fd\u662f\u9700\u5728\u8ba4\u8bc1\u7528\u6237\u8303\u56f4\u3002"),(0,a.yg)("hr",null),(0,a.yg)("h2",{id:"reporting-a-vulnerability"},"Reporting a Vulnerability"),(0,a.yg)("p",null,"Please do not file GitHub issues for security vulnerabilities as they are public!"),(0,a.yg)("p",null,"To report a new vulnerability you have discovered please follow the ",(0,a.yg)("a",{parentName:"p",href:"https://apache.org/security/#reporting-a-vulnerability"},"ASF vulnerability reporting process"),"."))}s.isMDXComponent=!0}}]);