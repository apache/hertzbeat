"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[31663],{15680:(e,t,n)=>{n.d(t,{xA:()=>y,yg:()=>c});var r=n(96540);function a(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function l(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function o(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?l(Object(n),!0).forEach((function(t){a(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):l(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function p(e,t){if(null==e)return{};var n,r,a=function(e,t){if(null==e)return{};var n,r,a={},l=Object.keys(e);for(r=0;r<l.length;r++)n=l[r],t.indexOf(n)>=0||(a[n]=e[n]);return a}(e,t);if(Object.getOwnPropertySymbols){var l=Object.getOwnPropertySymbols(e);for(r=0;r<l.length;r++)n=l[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(a[n]=e[n])}return a}var i=r.createContext({}),g=function(e){var t=r.useContext(i),n=t;return e&&(n="function"==typeof e?e(t):o(o({},t),e)),n},y=function(e){var t=g(e.components);return r.createElement(i.Provider,{value:t},e.children)},m={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},u=r.forwardRef((function(e,t){var n=e.components,a=e.mdxType,l=e.originalType,i=e.parentName,y=p(e,["components","mdxType","originalType","parentName"]),u=g(n),c=a,d=u["".concat(i,".").concat(c)]||u[c]||m[c]||l;return n?r.createElement(d,o(o({ref:t},y),{},{components:n})):r.createElement(d,o({ref:t},y))}));function c(e,t){var n=arguments,a=t&&t.mdxType;if("string"==typeof e||a){var l=n.length,o=new Array(l);o[0]=u;var p={};for(var i in t)hasOwnProperty.call(t,i)&&(p[i]=t[i]);p.originalType=e,p.mdxType="string"==typeof e?e:a,o[1]=p;for(var g=2;g<l;g++)o[g]=n[g];return r.createElement.apply(null,o)}return r.createElement.apply(null,n)}u.displayName="MDXCreateElement"},58065:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>i,contentTitle:()=>o,default:()=>m,frontMatter:()=>l,metadata:()=>p,toc:()=>g});var r=n(58168),a=(n(96540),n(15680));const l={id:"smtp",title:"SMTP \u90ae\u4ef6\u670d\u52a1\u5668\u76d1\u63a7",sidebar_label:"SMTP \u76d1\u63a7",keywords:["open source monitoring tool","open source SMTP monitoring tool","monitoring SMTP metrics"]},o=void 0,p={unversionedId:"help/smtp",id:"version-v1.6.x/help/smtp",title:"SMTP \u90ae\u4ef6\u670d\u52a1\u5668\u76d1\u63a7",description:"\u6536\u96c6\u548c\u76d1\u63a7 SMTP \u90ae\u4ef6\u670d\u52a1\u5668\u7684\u5e38\u89c4\u6027\u80fd\u6307\u6807\u3002",source:"@site/i18n/zh-cn/docusaurus-plugin-content-docs/version-v1.6.x/help/smtp.md",sourceDirName:"help",slug:"/help/smtp",permalink:"/zh-cn/docs/v1.6.x/help/smtp",draft:!1,editUrl:"https://github.com/apache/hertzbeat/edit/master/home/i18n/zh-cn/docusaurus-plugin-content-docs/version-v1.6.x/help/smtp.md",tags:[],version:"v1.6.x",frontMatter:{id:"smtp",title:"SMTP \u90ae\u4ef6\u670d\u52a1\u5668\u76d1\u63a7",sidebar_label:"SMTP \u76d1\u63a7",keywords:["open source monitoring tool","open source SMTP monitoring tool","monitoring SMTP metrics"]},sidebar:"docs",previous:{title:"POP3\u76d1\u63a7",permalink:"/zh-cn/docs/v1.6.x/help/pop3"},next:{title:"NTP \u670d\u52a1\u5668",permalink:"/zh-cn/docs/v1.6.x/help/ntp"}},i={},g=[{value:"\u914d\u7f6e\u53c2\u6570",id:"\u914d\u7f6e\u53c2\u6570",level:3},{value:"\u6536\u96c6\u7684\u6307\u6807",id:"\u6536\u96c6\u7684\u6307\u6807",level:3},{value:"\u6307\u6807\u96c6\uff1a\u6982\u8981",id:"\u6307\u6807\u96c6\u6982\u8981",level:4}],y={toc:g};function m(e){let{components:t,...n}=e;return(0,a.yg)("wrapper",(0,r.A)({},y,n,{components:t,mdxType:"MDXLayout"}),(0,a.yg)("blockquote",null,(0,a.yg)("p",{parentName:"blockquote"},"\u6536\u96c6\u548c\u76d1\u63a7 SMTP \u90ae\u4ef6\u670d\u52a1\u5668\u7684\u5e38\u89c4\u6027\u80fd\u6307\u6807\u3002")),(0,a.yg)("pre",null,(0,a.yg)("code",{parentName:"pre",className:"language-text"},"\u901a\u8fc7 SMTP \u7684 hello \u547d\u4ee4\u786e\u5b9a\u670d\u52a1\u5668\u662f\u5426\u53ef\u7528\n")),(0,a.yg)("blockquote",null,(0,a.yg)("p",{parentName:"blockquote"},"\u8be6\u89c1 ",(0,a.yg)("a",{parentName:"p",href:"https://datatracker.ietf.org/doc/html/rfc821#page-13"},"https://datatracker.ietf.org/doc/html/rfc821#page-13"))),(0,a.yg)("p",null,(0,a.yg)("strong",{parentName:"p"},"\u534f\u8bae\u4f7f\u7528\uff1aSMTP")),(0,a.yg)("h3",{id:"\u914d\u7f6e\u53c2\u6570"},"\u914d\u7f6e\u53c2\u6570"),(0,a.yg)("table",null,(0,a.yg)("thead",{parentName:"table"},(0,a.yg)("tr",{parentName:"thead"},(0,a.yg)("th",{parentName:"tr",align:null},"\u53c2\u6570\u540d\u79f0"),(0,a.yg)("th",{parentName:"tr",align:null},"\u53c2\u6570\u5e2e\u52a9\u63cf\u8ff0"))),(0,a.yg)("tbody",{parentName:"table"},(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"\u76d1\u63a7\u4e3b\u673a"),(0,a.yg)("td",{parentName:"tr",align:null},"\u88ab\u76d1\u63a7\u7684 IPV4\u3001IPV6 \u6216\u57df\u540d\u3002\u6ce8\u610f\u26a0\ufe0f\u65e0\u9700\u534f\u8bae\u5934\uff08\u4f8b\u5982\uff1ahttps://\u3001http://\uff09")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"\u76d1\u63a7\u540d\u79f0"),(0,a.yg)("td",{parentName:"tr",align:null},"\u6807\u8bc6\u6b64\u76d1\u63a7\u7684\u540d\u79f0\u3002\u540d\u79f0\u9700\u8981\u4fdd\u6301\u552f\u4e00")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"\u7aef\u53e3"),(0,a.yg)("td",{parentName:"tr",align:null},"SMTP \u63d0\u4f9b\u7684\u7aef\u53e3\u53f7")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"\u7535\u5b50\u90ae\u4ef6"),(0,a.yg)("td",{parentName:"tr",align:null},"\u60a8\u7684\u7535\u5b50\u90ae\u4ef6\u540d\u79f0\uff0c\u7528\u4e8e hello \u547d\u4ee4\u7684\u53c2\u6570")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"\u8d85\u65f6\u65f6\u95f4"),(0,a.yg)("td",{parentName:"tr",align:null},"\u5141\u8bb8\u7684\u6536\u96c6\u54cd\u5e94\u65f6\u95f4")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"\u6536\u96c6\u95f4\u9694"),(0,a.yg)("td",{parentName:"tr",align:null},"\u76d1\u89c6\u5b9a\u671f\u6570\u636e\u6536\u96c6\u7684\u95f4\u9694\u65f6\u95f4\uff0c\u5355\u4f4d\uff1a\u79d2\uff0c\u6700\u5c0f\u53ef\u8bbe\u7f6e\u7684\u95f4\u9694\u4e3a 30 \u79d2")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"\u662f\u5426\u68c0\u6d4b\u53ef\u7528\u6027"),(0,a.yg)("td",{parentName:"tr",align:null},"\u662f\u5426\u5728\u6dfb\u52a0\u76d1\u63a7\u4e4b\u524d\u68c0\u6d4b\u548c\u9a8c\u8bc1\u76d1\u63a7\u7684\u53ef\u7528\u6027\u3002\u53ea\u6709\u5728\u68c0\u6d4b\u6210\u529f\u540e\uff0c\u624d\u4f1a\u7ee7\u7eed\u8fdb\u884c\u6dfb\u52a0\u548c\u4fee\u6539\u64cd\u4f5c")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"\u63cf\u8ff0\u5907\u6ce8"),(0,a.yg)("td",{parentName:"tr",align:null},"\u7528\u4e8e\u6807\u8bc6\u548c\u63cf\u8ff0\u6b64\u76d1\u63a7\u7684\u66f4\u591a\u4fe1\u606f\uff0c\u7528\u6237\u53ef\u4ee5\u5728\u6b64\u5904\u6dfb\u52a0\u5907\u6ce8\u4fe1\u606f")))),(0,a.yg)("h3",{id:"\u6536\u96c6\u7684\u6307\u6807"},"\u6536\u96c6\u7684\u6307\u6807"),(0,a.yg)("h4",{id:"\u6307\u6807\u96c6\u6982\u8981"},"\u6307\u6807\u96c6\uff1a\u6982\u8981"),(0,a.yg)("table",null,(0,a.yg)("thead",{parentName:"table"},(0,a.yg)("tr",{parentName:"thead"},(0,a.yg)("th",{parentName:"tr",align:null},"\u6307\u6807\u540d\u79f0"),(0,a.yg)("th",{parentName:"tr",align:null},"\u6307\u6807\u5355\u4f4d"),(0,a.yg)("th",{parentName:"tr",align:null},"\u6307\u6807\u5e2e\u52a9\u63cf\u8ff0"))),(0,a.yg)("tbody",{parentName:"table"},(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"\u54cd\u5e94\u65f6\u95f4"),(0,a.yg)("td",{parentName:"tr",align:null},"\u6beb\u79d2"),(0,a.yg)("td",{parentName:"tr",align:null},"SMTP \u670d\u52a1\u5668\u54cd\u5e94\u8bf7\u6c42\u6240\u9700\u7684\u65f6\u95f4")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"\u54cd\u5e94\u72b6\u6001"),(0,a.yg)("td",{parentName:"tr",align:null}),(0,a.yg)("td",{parentName:"tr",align:null},"\u54cd\u5e94\u72b6\u6001")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"SMTP \u670d\u52a1\u5668\u6807\u8bed"),(0,a.yg)("td",{parentName:"tr",align:null}),(0,a.yg)("td",{parentName:"tr",align:null},"SMTP \u670d\u52a1\u5668\u7684\u6807\u8bed")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"helo \u547d\u4ee4\u8fd4\u56de\u4fe1\u606f"),(0,a.yg)("td",{parentName:"tr",align:null}),(0,a.yg)("td",{parentName:"tr",align:null},"helo \u547d\u4ee4\u8fd4\u56de\u7684\u54cd\u5e94\u4fe1\u606f")))))}m.isMDXComponent=!0}}]);