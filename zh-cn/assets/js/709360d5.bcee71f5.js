"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[22097],{15680:(e,t,a)=>{a.d(t,{xA:()=>y,yg:()=>c});var n=a(96540);function r(e,t,a){return t in e?Object.defineProperty(e,t,{value:a,enumerable:!0,configurable:!0,writable:!0}):e[t]=a,e}function l(e,t){var a=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),a.push.apply(a,n)}return a}function p(e){for(var t=1;t<arguments.length;t++){var a=null!=arguments[t]?arguments[t]:{};t%2?l(Object(a),!0).forEach((function(t){r(e,t,a[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(a)):l(Object(a)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(a,t))}))}return e}function i(e,t){if(null==e)return{};var a,n,r=function(e,t){if(null==e)return{};var a,n,r={},l=Object.keys(e);for(n=0;n<l.length;n++)a=l[n],t.indexOf(a)>=0||(r[a]=e[a]);return r}(e,t);if(Object.getOwnPropertySymbols){var l=Object.getOwnPropertySymbols(e);for(n=0;n<l.length;n++)a=l[n],t.indexOf(a)>=0||Object.prototype.propertyIsEnumerable.call(e,a)&&(r[a]=e[a])}return r}var o=n.createContext({}),g=function(e){var t=n.useContext(o),a=t;return e&&(a="function"==typeof e?e(t):p(p({},t),e)),a},y=function(e){var t=g(e.components);return n.createElement(o.Provider,{value:t},e.children)},m={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},u=n.forwardRef((function(e,t){var a=e.components,r=e.mdxType,l=e.originalType,o=e.parentName,y=i(e,["components","mdxType","originalType","parentName"]),u=g(a),c=r,s=u["".concat(o,".").concat(c)]||u[c]||m[c]||l;return a?n.createElement(s,p(p({ref:t},y),{},{components:a})):n.createElement(s,p({ref:t},y))}));function c(e,t){var a=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var l=a.length,p=new Array(l);p[0]=u;var i={};for(var o in t)hasOwnProperty.call(t,o)&&(i[o]=t[o]);i.originalType=e,i.mdxType="string"==typeof e?e:r,p[1]=i;for(var g=2;g<l;g++)p[g]=a[g];return n.createElement.apply(null,p)}return n.createElement.apply(null,a)}u.displayName="MDXCreateElement"},85687:(e,t,a)=>{a.r(t),a.d(t,{assets:()=>o,contentTitle:()=>p,default:()=>m,frontMatter:()=>l,metadata:()=>i,toc:()=>g});var n=a(58168),r=(a(96540),a(15680));const l={},p="\u3010\u5f00\u6e90\u4e4b\u590f\u3011Hertzbeat \u8bfe\u9898\u4ecb\u7ecd",i={permalink:"/zh-cn/blog/2024/05/09/hertzbeat-ospp-subject-introduction",editUrl:"https://github.com/apache/hertzbeat/edit/master/home/i18n/zh-cn/docusaurus-plugin-content-blog/2024-05-09-hertzbeat-ospp-subject-introduction.md",source:"@site/i18n/zh-cn/docusaurus-plugin-content-blog/2024-05-09-hertzbeat-ospp-subject-introduction.md",title:"\u3010\u5f00\u6e90\u4e4b\u590f\u3011Hertzbeat \u8bfe\u9898\u4ecb\u7ecd",description:"\u4ec0\u4e48\u662f HertzBeat \uff1f",date:"2024-05-09T00:00:00.000Z",formattedDate:"2024\u5e745\u67089\u65e5",tags:[],readingTime:8.055,hasTruncateMarker:!1,authors:[],frontMatter:{},prevItem:{title:"HertzBeat 1.6.0 \u5347\u7ea7\u6307\u5357",permalink:"/zh-cn/blog/2024/06/11/hertzbeat-v1.6.0-update"},nextItem:{title:"\u5f00\u6e90\u5b9e\u65f6\u76d1\u63a7 HertzBeat \u6350\u8d60\u8fdb\u5165 Apache \u5b75\u5316\u5668\u3002",permalink:"/zh-cn/blog/2024/04/17/to-apache"}},o={authorsImageUrls:[]},g=[{value:"\u4ec0\u4e48\u662f HertzBeat \uff1f",id:"\u4ec0\u4e48\u662f-hertzbeat-",level:2},{value:"<strong>\u7279\u70b9</strong>",id:"\u7279\u70b9",level:3},{value:"\u4ec0\u4e48\u662f\u5f00\u6e90\u4e4b\u590f\uff1f",id:"\u4ec0\u4e48\u662f\u5f00\u6e90\u4e4b\u590f",level:2},{value:"HertzBeat \u8bfe\u9898",id:"hertzbeat-\u8bfe\u9898",level:2},{value:"1\u3001\u5b9e\u73b0\u76d1\u63a7\u6a21\u7248\u5e02\u573a\u5546\u5e97",id:"1\u5b9e\u73b0\u76d1\u63a7\u6a21\u7248\u5e02\u573a\u5546\u5e97",level:3},{value:"2\u3001\u5b9e\u73b0 Java \u539f\u751f\u7684 ipmi2 \u901a\u4fe1\u534f\u8bae",id:"2\u5b9e\u73b0-java-\u539f\u751f\u7684-ipmi2-\u901a\u4fe1\u534f\u8bae",level:3},{value:"\u53c2\u4e0e HertzBeat \u80fd\u6536\u83b7\u4ec0\u4e48\uff1f",id:"\u53c2\u4e0e-hertzbeat-\u80fd\u6536\u83b7\u4ec0\u4e48",level:2}],y={toc:g};function m(e){let{components:t,...a}=e;return(0,r.yg)("wrapper",(0,n.A)({},y,a,{components:t,mdxType:"MDXLayout"}),(0,r.yg)("h2",{id:"\u4ec0\u4e48\u662f-hertzbeat-"},"\u4ec0\u4e48\u662f HertzBeat \uff1f"),(0,r.yg)("p",null,(0,r.yg)("inlineCode",{parentName:"p"},"HertzBeat")," \u8d6b\u5179\u8df3\u52a8 \u662f\u4e00\u4e2a\u62e5\u6709\u5f3a\u5927\u81ea\u5b9a\u4e49\u76d1\u63a7\u80fd\u529b\uff0c\u9ad8\u6027\u80fd\u96c6\u7fa4\uff0c\u517c\u5bb9 Prometheus\uff0c\u65e0\u9700 Agent \u7684\u5f00\u6e90\u5b9e\u65f6\u76d1\u63a7\u544a\u8b66\u7cfb\u7edf\u3002"),(0,r.yg)("h3",{id:"\u7279\u70b9"},(0,r.yg)("strong",{parentName:"h3"},"\u7279\u70b9")),(0,r.yg)("ul",null,(0,r.yg)("li",{parentName:"ul"},"\u96c6 ",(0,r.yg)("strong",{parentName:"li"},"\u76d1\u63a7+\u544a\u8b66+\u901a\u77e5")," \u4e3a\u4e00\u4f53\uff0c\u652f\u6301\u5bf9\u5e94\u7528\u670d\u52a1\uff0c\u5e94\u7528\u7a0b\u5e8f\uff0c\u6570\u636e\u5e93\uff0c\u7f13\u5b58\uff0c\u64cd\u4f5c\u7cfb\u7edf\uff0c\u5927\u6570\u636e\uff0c\u4e2d\u95f4\u4ef6\uff0cWeb\u670d\u52a1\u5668\uff0c\u4e91\u539f\u751f\uff0c\u7f51\u7edc\uff0c\u81ea\u5b9a\u4e49\u7b49\u76d1\u63a7\u9608\u503c\u544a\u8b66\u901a\u77e5\u4e00\u6b65\u5230\u4f4d\u3002"),(0,r.yg)("li",{parentName:"ul"},"\u6613\u7528\u53cb\u597d\uff0c\u65e0\u9700 ",(0,r.yg)("inlineCode",{parentName:"li"},"Agent"),"\uff0c\u5168 ",(0,r.yg)("inlineCode",{parentName:"li"},"WEB")," \u9875\u9762\u64cd\u4f5c\uff0c\u9f20\u6807\u70b9\u4e00\u70b9\u5c31\u80fd\u76d1\u63a7\u544a\u8b66\uff0c\u96f6\u4e0a\u624b\u5b66\u4e60\u6210\u672c\u3002"),(0,r.yg)("li",{parentName:"ul"},"\u5c06 ",(0,r.yg)("inlineCode",{parentName:"li"},"Http, Jmx, Ssh, Snmp, Jdbc, Prometheus")," \u7b49\u534f\u8bae\u89c4\u8303\u53ef\u914d\u7f6e\u5316\uff0c\u53ea\u9700\u5728\u6d4f\u89c8\u5668\u914d\u7f6e\u76d1\u63a7\u6a21\u7248 ",(0,r.yg)("inlineCode",{parentName:"li"},"YML")," \u5c31\u80fd\u4f7f\u7528\u8fd9\u4e9b\u534f\u8bae\u53bb\u81ea\u5b9a\u4e49\u91c7\u96c6\u60f3\u8981\u7684\u6307\u6807\u3002\u60a8\u76f8\u4fe1\u53ea\u9700\u914d\u7f6e\u4e0b\u5c31\u80fd\u7acb\u523b\u9002\u914d\u4e00\u6b3e ",(0,r.yg)("inlineCode",{parentName:"li"},"K8s")," \u6216 ",(0,r.yg)("inlineCode",{parentName:"li"},"Docker")," \u7b49\u65b0\u7684\u76d1\u63a7\u7c7b\u578b\u5417\uff1f"),(0,r.yg)("li",{parentName:"ul"},"\u517c\u5bb9 ",(0,r.yg)("inlineCode",{parentName:"li"},"Prometheus")," \u7684\u7cfb\u7edf\u751f\u6001\u5e76\u4e14\u66f4\u591a\uff0c\u53ea\u9700\u9875\u9762\u64cd\u4f5c\u5c31\u53ef\u4ee5\u76d1\u63a7 ",(0,r.yg)("inlineCode",{parentName:"li"},"Prometheus")," \u6240\u80fd\u76d1\u63a7\u7684\u3002"),(0,r.yg)("li",{parentName:"ul"},"\u9ad8\u6027\u80fd\uff0c\u652f\u6301\u591a\u91c7\u96c6\u5668\u96c6\u7fa4\u6a2a\u5411\u6269\u5c55\uff0c\u652f\u6301\u591a\u9694\u79bb\u7f51\u7edc\u76d1\u63a7\uff0c\u4e91\u8fb9\u534f\u540c\u3002"),(0,r.yg)("li",{parentName:"ul"},"\u81ea\u7531\u7684\u544a\u8b66\u9608\u503c\u89c4\u5219\uff0c",(0,r.yg)("inlineCode",{parentName:"li"},"\u90ae\u4ef6")," ",(0,r.yg)("inlineCode",{parentName:"li"},"Discord")," ",(0,r.yg)("inlineCode",{parentName:"li"},"Slack")," ",(0,r.yg)("inlineCode",{parentName:"li"},"Telegram")," ",(0,r.yg)("inlineCode",{parentName:"li"},"\u9489\u9489")," ",(0,r.yg)("inlineCode",{parentName:"li"},"\u5fae\u4fe1")," ",(0,r.yg)("inlineCode",{parentName:"li"},"\u98de\u4e66")," ",(0,r.yg)("inlineCode",{parentName:"li"},"\u77ed\u4fe1")," ",(0,r.yg)("inlineCode",{parentName:"li"},"Webhook")," ",(0,r.yg)("inlineCode",{parentName:"li"},"Server\u9171")," \u7b49\u65b9\u5f0f\u6d88\u606f\u53ca\u65f6\u9001\u8fbe\u3002")),(0,r.yg)("p",null,(0,r.yg)("strong",{parentName:"p"},"Github: ",(0,r.yg)("a",{parentName:"strong",href:"https://github.com/apache/hertzbeat"},"https://github.com/apache/hertzbeat"))),(0,r.yg)("p",null,(0,r.yg)("strong",{parentName:"p"},"Gitee: ",(0,r.yg)("a",{parentName:"strong",href:"https://gitee.com/hertzbeat/hertzbeat"},"https://gitee.com/hertzbeat/hertzbeat"))),(0,r.yg)("h2",{id:"\u4ec0\u4e48\u662f\u5f00\u6e90\u4e4b\u590f"},"\u4ec0\u4e48\u662f\u5f00\u6e90\u4e4b\u590f\uff1f"),(0,r.yg)("p",null,"\u5f00\u6e90\u4e4b\u590f\u662f\u7531\u4e2d\u56fd\u79d1\u5b66\u9662\u8f6f\u4ef6\u7814\u7a76\u6240\u201c\u5f00\u6e90\u8f6f\u4ef6\u4f9b\u5e94\u94fe\u70b9\u4eae\u8ba1\u5212\u201d\u53d1\u8d77\u5e76\u957f\u671f\u652f\u6301\u7684\u4e00\u9879\u6691\u671f\u5f00\u6e90\u6d3b\u52a8\uff0c\u65e8\u5728\u9f13\u52b1\u5728"),(0,r.yg)("p",null,"\u6821\u5b66\u751f\u79ef\u6781\u53c2\u4e0e\u5f00\u6e90\u8f6f\u4ef6\u7684\u5f00\u53d1\u7ef4\u62a4\uff0c\u57f9\u517b\u548c\u53d1\u6398\u66f4\u591a\u4f18\u79c0\u7684\u5f00\u53d1\u8005\uff0c\u4fc3\u8fdb\u4f18\u79c0\u5f00\u6e90\u8f6f\u4ef6\u793e\u533a\u7684\u84ec\u52c3\u53d1\u5c55\uff0c\u52a9\u529b\u5f00"),(0,r.yg)("p",null,"\u6e90\u8f6f\u4ef6\u4f9b\u5e94\u94fe\u5efa\u8bbe\u3002"),(0,r.yg)("p",null,"\u5f00\u6e90\u4e4b\u590f\u8054\u5408\u56fd\u5185\u5916\u5f00\u6e90\u793e\u533a\uff0c\u9488\u5bf9\u91cd\u8981\u5f00\u6e90\u8f6f\u4ef6\u7684\u5f00\u53d1\u4e0e\u7ef4\u62a4\u63d0\u4f9b\u9879\u76ee\u4efb\u52a1\uff0c\u9762\u5411\u5168\u7403\u9ad8\u6821\u5b66\u751f\u5f00\u653e\u62a5\u540d"),(0,r.yg)("p",null,"\u4e2d\u9009\u5b66\u751f\u5c06\u5728\u9879\u76ee\u8d44\u6df1\u5f00\u53d1\u8005\uff08\u9879\u76ee\u5bfc\u5e08\uff09\u7684\u6307\u5bfc\u4e0b\uff0c\u53c2\u4e0e\u5f00\u6e90\u8d21\u732e\uff0c\u5b8c\u6210\u5f00\u53d1\u5de5\u4f5c\u5e76\u8d21\u732e\u7ed9\u5f00\u6e90\u793e\u533a"),(0,r.yg)("p",null,(0,r.yg)("strong",{parentName:"p"},"\u6d3b\u52a8\u89c4\u5219")),(0,r.yg)("p",null,"\u5f00\u6e90\u4e4b\u590f\u5b98\u7f51\uff1a"),(0,r.yg)("p",null,(0,r.yg)("a",{parentName:"p",href:"https://summer-ospp.ac.cn/"},(0,r.yg)("em",{parentName:"a"},"https://summer-ospp.ac.cn/"))),(0,r.yg)("p",null,"\u5404\u4f4d\u540c\u5b66\u53ef\u4ee5\u81ea\u7531\u9009\u62e9\u9879\u76ee\uff0c\u4e0e\u793e\u533a\u5bfc\u5e08\u6c9f\u901a\u5b9e\u73b0\u65b9\u6848\u5e76\u64b0\u5199\u9879\u76ee\u8ba1\u5212\u4e66\u3002\u88ab\u9009\u4e2d\u7684\u5b66\u751f\u5c06\u5728\u793e\u533a\u5bfc\u5e08\u6307\u5bfc\u4e0b\uff0c\u6309\u8ba1\u5212\u5b8c\u6210\u5f00\u53d1\u5de5\u4f5c\uff0c\u5e76\u5c06\u6210\u679c\u8d21\u732e\u7ed9\u793e\u533a\u3002\u793e\u533a\u8bc4\u4f30\u5b66\u751f\u7684\u5b8c\u6210\u5ea6\uff0c\u4e3b\u529e\u65b9\u6839\u636e\u8bc4\u4f30\u7ed3\u679c\u53d1\u653e\u8d44\u52a9\u91d1\u989d\u7ed9\u5b66\u751f\u3002"),(0,r.yg)("h2",{id:"hertzbeat-\u8bfe\u9898"},"HertzBeat \u8bfe\u9898"),(0,r.yg)("h3",{id:"1\u5b9e\u73b0\u76d1\u63a7\u6a21\u7248\u5e02\u573a\u5546\u5e97"},"1\u3001\u5b9e\u73b0\u76d1\u63a7\u6a21\u7248\u5e02\u573a\u5546\u5e97"),(0,r.yg)("p",null,(0,r.yg)("strong",{parentName:"p"},"\u9879\u76ee\u96be\u5ea6\uff1a\u8fdb\u9636/Advanced")),(0,r.yg)("p",null,(0,r.yg)("strong",{parentName:"p"},"\u80cc\u666f\uff1a")," \u56e0\u4e3a ",(0,r.yg)("inlineCode",{parentName:"p"},"HertzBeat")," \u662f\u4e00\u6b3e\u901a\u8fc7 yml \u6587\u4ef6\u9ad8\u5ea6\u81ea\u5b9a\u4e49\u7684\u76d1\u63a7\u7cfb\u7edf\uff0c\u6211\u4eec\u53ef\u4ee5\u901a\u8fc7\u914d\u7f6e\u76f8\u5173\u7684 yml \u6587\u4ef6\u6765\u8fdb\u884c"),(0,r.yg)("p",null,"\u5bf9\u6211\u4eec\u60f3\u8981\u76d1\u63a7\u7684\u6307\u6807\u8fdb\u884c\u91c7\u96c6\u3002\u4e00\u4e9b\u4e0d\u540c\u7528\u6237\u5bf9\u4e00\u4e9b\u4e2d\u95f4\u4ef6\u7684\u6570\u636e\u7684\u6307\u6807\u9700\u6c42\u53ef\u80fd\u4e0d\u540c\uff0c",(0,r.yg)("inlineCode",{parentName:"p"},"HertzBeat")," \u5b98\u65b9\u81ea\u5e26"),(0,r.yg)("p",null,"\u7684 yml \u914d\u7f6e\u53ef\u80fd\u5e76\u4e0d\u80fd\u6ee1\u8db3\u6bcf\u4e00\u4e2a\u7528\u6237\uff0c\u6240\u4ee5\u6211\u4eec\u7684\u76ee\u7684\u5c31\u662f\u53bb\u8ba9\u7528\u6237\u8d21\u732e\u81ea\u5df1\u7684 yml \u6a21\u7248\u53bb\u8ba9\u66f4\u591a\u7684\u4eba\u53d7\u60e0\u3002"),(0,r.yg)("p",null,"\u8fd9\u6837\u4e0d\u4ec5\u80fd\u8ba9 ",(0,r.yg)("inlineCode",{parentName:"p"},"HertzBeat")," \u7684\u751f\u6001\u66f4\u52a0\u5b8c\u5584\uff0c\u4e5f\u80fd\u8ba9\u7528\u6237\u7684\u4f53\u9a8c\u53d8\u7684\u66f4\u597d\uff01"),(0,r.yg)("p",null,(0,r.yg)("strong",{parentName:"p"},"\u8981\u6c42\uff1a")),(0,r.yg)("ol",null,(0,r.yg)("li",{parentName:"ol"},"\u4f7f\u7528Java17, springboot3\u7f16\u5199\u540e\u7aef\u4ee3\u7801\uff0cAngular(\u5efa\u8bae)\u6216Vue\u7f16\u5199\u524d\u7aef\u4ee3\u7801\u3002"),(0,r.yg)("li",{parentName:"ol"},"\u5b9e\u73b0yml\u6a21\u677f\u6587\u4ef6\u7684\u641c\u7d22\u3001\u4e0b\u8f7d\u3001\u5206\u4eab\u529f\u80fd\uff08\u65e0\u9700\u767b\u5f55\uff09\u3002"),(0,r.yg)("li",{parentName:"ol"},"\u6a21\u677f\u9875\u9762\u5c55\u793a\u4e0b\u8f7d\u91cf\u3001\u5206\u7c7b\u3001\u6a21\u677f\u63cf\u8ff0\u4fe1\u606f\u3001\u6a21\u7248\u5386\u53f2\u7248\u672c(\u53ef\u9009)\u3002"),(0,r.yg)("li",{parentName:"ol"},"\u5b9e\u73b0\u7528\u6237\u4e2a\u4eba\u9875\u9762\u6ce8\u518c\u3001\u767b\u5f55(\u540e\u671f)\uff0c\u4e0a\u4f20\u6a21\u677f\u3002")),(0,r.yg)("p",null,(0,r.yg)("strong",{parentName:"p"},"\u4ea7\u51fa\uff1a")),(0,r.yg)("ul",null,(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("ol",{parentName:"li"},(0,r.yg)("li",{parentName:"ol"},"\u7279\u6027\u4ee3\u7801\u80fd\u4ee5PR\u7684\u5f62\u5f0f\u5408\u5165HertzBeat\u4ed3\u5e93\u3002"))),(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("ol",{parentName:"li",start:2},(0,r.yg)("li",{parentName:"ol"},"\u5b8c\u6210 HertzBeat\u5b98\u65b9\u6a21\u677f\u5e02\u573a"))),(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("ol",{parentName:"li",start:3},(0,r.yg)("li",{parentName:"ol"},"\u66f4\u65b0\u76f8\u5173\u5e2e\u52a9\u6587\u6863")))),(0,r.yg)("p",null,(0,r.yg)("strong",{parentName:"p"},"\u8054\u7cfb\u5bfc\u5e08\uff1a")," \u8d75\u9752\u7136 ",(0,r.yg)("a",{parentName:"p",href:"mailto:zqr10159@dromara.org"},"zqr10159@dromara.org")),(0,r.yg)("h3",{id:"2\u5b9e\u73b0-java-\u539f\u751f\u7684-ipmi2-\u901a\u4fe1\u534f\u8bae"},"2\u3001\u5b9e\u73b0 Java \u539f\u751f\u7684 ipmi2 \u901a\u4fe1\u534f\u8bae"),(0,r.yg)("p",null,(0,r.yg)("strong",{parentName:"p"},"\u9879\u76ee\u96be\u5ea6\uff1a\u8fdb\u9636/Advanced")),(0,r.yg)("p",null,(0,r.yg)("strong",{parentName:"p"},"\u80cc\u666f\uff1a")," ",(0,r.yg)("inlineCode",{parentName:"p"},"HertzBeat")," \u2f40\u6301\u591a\u79cd\u76d1\u63a7\u534f\u8bae\uff0c\u4f8b\u5982http\u3001jmx\u3001jdbc \u548c snmp\u7b49\u3002\u901a\u8fc7\u5c01\u88c5\u8fd9\u4e9b\u534f\u8bae\u53ef\u4ee5\u53bb\u5b9e\u73b0\u5bf9\u5404\u79cd"),(0,r.yg)("p",null,"\u4e2d\u95f4\u4ef6\u7684\u76d1\u63a7\u4e14\u2f46\u9700 Agent \u3002 \u4e3a\u4e86\u4f7f HertzBeat \u5177\u6709\u66f4\u2f34\u7684\u76d1\u63a7\u9886\u57df\uff0c\u6211\u4eec\u6253\u7b97\u53bb\u57fa\u4e8e Java \u8bed\u2f94,\u4e0d\u4f9d\u8d56\u7b2c\u4e09\u2f45"),(0,r.yg)("p",null,"\u5305,\u5b9e\u73b0\u539f\u2f63\u7684 IPMI2 \u534f\u8bae\u4e2d\u7684\u67e5\u8be2\u90e8\u5206,\u5e76\u5229\u2f64\u8be5\u534f\u8bae\u83b7\u53d6\u670d\u52a1\u5668\u7684\u4e3b\u677f\u4fe1\u606f\u3001\u2f79\u5361\u4fe1\u606f\u3001\u7535\u6e90\u4fe1\u606f\u3001\u2edb\u6247\u4fe1\u606f\u3001"),(0,r.yg)("p",null,"\u6e29\u5ea6\u4f20\u611f\u5668\u4fe1\u606f\u548c\u65f6\u949f\u4fe1\u606f\u3002"),(0,r.yg)("p",null,(0,r.yg)("strong",{parentName:"p"},"\u8981\u6c42\uff1a")),(0,r.yg)("ol",null,(0,r.yg)("li",{parentName:"ol"},"\u4f7f\u2f64 Java \u57fa\u4e8e UDP \u534f\u8bae\u5b9e\u73b0\u539f\u2f63\u7684 IPMI2 \u534f\u8bae(\u67e5\u8be2\u90e8\u5206),\u4e0d\u4f9d\u8d56\u4efb\u4f55\u7b2c\u4e09\u2f45\u5305\u3002"),(0,r.yg)("li",{parentName:"ol"},"\u5229\u2f64\u5b9e\u73b0\u7684 IPMI2 \u534f\u8bae\u67e5\u8be2\u5f00\u542f IPMI \u7684\u670d\u52a1\u5668\u7684\u5404\u9879\u6307\u6807\u4fe1\u606f,\u5305\u62ec\u4e3b\u677f\u4fe1\u606f\u3001\u2f79\u5361\u4fe1\u606f\u3001\u7535\u6e90\u4fe1\u606f\u3001\u2edb\u6247\u4fe1")),(0,r.yg)("p",null,"\u606f\u3001\u6e29\u5ea6\u4f20\u611f\u5668\u4fe1\u606f\u548c\u65f6\u949f\u4fe1\u606f\u3002"),(0,r.yg)("ol",{start:3},(0,r.yg)("li",{parentName:"ol"},"\u5bf9\u67e5\u8be2\u5230\u7684\u6307\u6807\u4fe1\u606f\u8fdb\u2f8f\u62bd\u8c61\u548c\u89c4\u8303\u5316\u5904\u7406,\u5b9e\u73b0\u914d\u7f6e\u5316\u7ba1\u7406(\u53ef\u9009)\u3002"),(0,r.yg)("li",{parentName:"ol"},"\u8f93\u51fa\u8be6\u7ec6\u7684\u9879\u2f6c\u2f42\u6863,\u5305\u62ec\u8bbe\u8ba1\u601d\u8def\u3001\u5b9e\u73b0\u7ec6\u8282\u3001\u4f7f\u2f64\u8bf4\u660e\u7b49\u3002")),(0,r.yg)("p",null,(0,r.yg)("strong",{parentName:"p"},"\u4ea7\u51fa\uff1a")),(0,r.yg)("ul",null,(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("p",{parentName:"li"},"\u7279\u6027\u4ee3\u7801\u80fd\u4ee5PR\u7684\u5f62\u5f0f\u5408\u2f0aHertzBeat\u4ed3\u5e93\u3002")),(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("p",{parentName:"li"},"\u5b8c\u6210 Java \u57fa\u4e8e UDP \u534f\u8bae\u5b9e\u73b0\u539f\u2f63\u7684 IPMI2 \u534f\u8bae\u7684\u5c01\u88c5\u5e76\u80fd\u5bf9\u76f8\u5bf9\u5e94\u7684\u670d\u52a1\u5668\u8fdb\u2f8f\u76d1\u63a7\u3002")),(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("p",{parentName:"li"},"\u53ef\u4ee5\u901a\u8fc7\u914d\u7f6e YML \u2f42\u4ef6\u53bb\u2fbc\u5ea6\u2f83\u5b9a\u4e49\u5316\u76d1\u63a7\u6307\u6807\uff08\u53ef\u9009\uff09\u3002")),(0,r.yg)("li",{parentName:"ul"},(0,r.yg)("p",{parentName:"li"},"\u5b8c\u5584\u5e2e\u52a9\u2f42\u6863\u3002"))),(0,r.yg)("p",null,(0,r.yg)("strong",{parentName:"p"},"\u8054\u7cfb\u5bfc\u5e08\uff1a")," \u94c1\u7532\u5c0f\u5b9d ",(0,r.yg)("a",{parentName:"p",href:"mailto:tjxiaobao2024@qq.com"},"tjxiaobao2024@qq.com")),(0,r.yg)("h2",{id:"\u53c2\u4e0e-hertzbeat-\u80fd\u6536\u83b7\u4ec0\u4e48"},"\u53c2\u4e0e HertzBeat \u80fd\u6536\u83b7\u4ec0\u4e48\uff1f"),(0,r.yg)("p",null,"\u6709\u7684\u540c\u5b66\u53ef\u80fd\u4f1a\u7591\u60d1\u53c2\u4e0e\u5f00\u6e90\u4e4b\u590f\u80fd\u6536\u83b7\u5230\u4ec0\u4e48\u5462\uff1f"),(0,r.yg)("ol",null,(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("strong",{parentName:"li"},"\u3010\u4f60\u7684\u4ee3\u7801\u88ab\u793e\u4f1a\u5e7f\u6cdb\u590d\u7528\u3011\u4f60\u7684\u4ee3\u7801\u53ef\u80fd\u4f1a\u8fd0\u884c\u5728\u4e0a\u4e07\u5bb6\u4f01\u4e1a\u6838\u5fc3\u4e1a\u52a1\u903b\u8f91\u4e2d\uff0c\u5e2e\u52a9\u4f01\u4e1a\u89e3\u51b3\u95ee\u9898\u3002")),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("strong",{parentName:"li"},"\u3010\u8d62\u5f97\u6700\u9ad812000\u5956\u91d1\u3011\u5956\u91d1\u603b\u989d\u6839\u636e\u9879\u76ee\u96be\u5ea6\u5206\u4e3a\u8fdb\u9636 12000 \u5143\u3001\u57fa\u7840 8000 \u5143\uff08\u6ce8\uff1a\u5956\u91d1\u6570\u989d\u4e3a\u7a0e\u524d\u4eba\u6c11\u5e01\u91d1\u989d\uff09")),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("strong",{parentName:"li"},"\u3010\u793e\u533a\u6838\u5fc3\u4eba\u5458\u8f85\u5bfc\u5feb\u901f\u6210\u957f\u3011\u53ea\u8981\u4f60\u62a5\u540d\u88ab\u9009\u4e2d\uff0c\u6bcf\u4e2a\u9898\u76ee\u7684\u5bfc\u5e08\u4f1a\u7cbe\u5fc3\u624b\u628a\u624b\u6559\u4f60\u878d\u5165\u793e\u533a\uff0c\u5e2e\u52a9\u4f60\u5b8c\u6210\u9898\u76ee\u7684\u8bbe\u8ba1\u4ee5\u53ca\u6700\u7ec8\u7684\u843d\u5730\u3002")),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("strong",{parentName:"li"},"\u3010\u63a8\u8350\u5165\u804c/\u5b9e\u4e60\u3011\u5728\u672c\u6b21\u7f16\u7a0b\u4e4b\u590f\u9879\u76ee\u4e2d\u8868\u73b0\u4f18\u79c0\u540c\u5b66\uff0c\u53ef\u63a8\u8350\u5165\u804c/\u5b9e\u4e60 \u4f60\u5fc3\u610f\u7684\u516c\u53f8\u5de5\u4f5c\u3002")),(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("strong",{parentName:"li"},"\u3010\u989d\u5916\u83b7\u5f97\u793e\u533a\u60ca\u559c\u3011\u6240\u6709\u53c2\u4e0e\u672c\u6b21\u7f16\u7a0b\u4e4b\u590f\u9879\u76ee\u7684\u540c\u5b66\uff0c\u5747\u53ef\u6709\u673a\u4f1a\u6210\u4e3a Apache HertzBeat \u7684committer\uff0c\u5e76\u62e5\u6709\u5c5e\u4e8e\u81ea\u5df1\u7684 apache\u90ae\u7bb1\u3002"))),(0,r.yg)("p",null,(0,r.yg)("strong",{parentName:"p"},"\u767e\u5206\u767e\u6709\u5956\u54c1\u62ff\u54e6"),"\uff0c\u73b0\u5728\u552f\u4e00\u7684\u95ee\u9898\u662f\u65f6\u95f4\u4e0d\u591a\u4e86\uff0c\u8d76\u7d27\u4e0a\u8f66\u62a5\u540d\uff01\u622a\u6b62\u62a5\u540d\u65f6\u95f4\u662f6\u67084\u65e5\uff0c\u5feb\u70b9\u6765\u62a5\u540d\u53c2\u4e0e 2023 \u7f16\u7a0b\u4e4b\u590f\u5427~"))}m.isMDXComponent=!0}}]);