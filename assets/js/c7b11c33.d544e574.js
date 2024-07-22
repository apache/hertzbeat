"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[70004],{15680:(e,t,n)=>{n.d(t,{xA:()=>c,yg:()=>d});var r=n(96540);function a(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function i(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function o(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?i(Object(n),!0).forEach((function(t){a(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):i(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function l(e,t){if(null==e)return{};var n,r,a=function(e,t){if(null==e)return{};var n,r,a={},i=Object.keys(e);for(r=0;r<i.length;r++)n=i[r],t.indexOf(n)>=0||(a[n]=e[n]);return a}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(r=0;r<i.length;r++)n=i[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(a[n]=e[n])}return a}var m=r.createContext({}),p=function(e){var t=r.useContext(m),n=t;return e&&(n="function"==typeof e?e(t):o(o({},t),e)),n},c=function(e){var t=p(e.components);return r.createElement(m.Provider,{value:t},e.children)},g={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},s=r.forwardRef((function(e,t){var n=e.components,a=e.mdxType,i=e.originalType,m=e.parentName,c=l(e,["components","mdxType","originalType","parentName"]),s=p(n),d=a,y=s["".concat(m,".").concat(d)]||s[d]||g[d]||i;return n?r.createElement(y,o(o({ref:t},c),{},{components:n})):r.createElement(y,o({ref:t},c))}));function d(e,t){var n=arguments,a=t&&t.mdxType;if("string"==typeof e||a){var i=n.length,o=new Array(i);o[0]=s;var l={};for(var m in t)hasOwnProperty.call(t,m)&&(l[m]=t[m]);l.originalType=e,l.mdxType="string"==typeof e?e:a,o[1]=l;for(var p=2;p<i;p++)o[p]=n[p];return r.createElement.apply(null,o)}return r.createElement.apply(null,n)}s.displayName="MDXCreateElement"},4922:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>m,contentTitle:()=>o,default:()=>g,frontMatter:()=>i,metadata:()=>l,toc:()=>p});var r=n(58168),a=(n(96540),n(15680));const i={id:"imap",title:"Monitoring detailed mailbox info",sidebar_label:"mailbox Monitor",keywords:["Open Source Monitoring System","Open Source Network Monitoring","mailbox Monitor"]},o=void 0,l={unversionedId:"help/imap",id:"help/imap",title:"Monitoring detailed mailbox info",description:"IMAP, or Internet Message Access Protocol, allows you to retrieve detailed information from your email server.",source:"@site/docs/help/imap.md",sourceDirName:"help",slug:"/help/imap",permalink:"/docs/help/imap",draft:!1,editUrl:"https://github.com/apache/hertzbeat/edit/master/home/docs/help/imap.md",tags:[],version:"current",frontMatter:{id:"imap",title:"Monitoring detailed mailbox info",sidebar_label:"mailbox Monitor",keywords:["Open Source Monitoring System","Open Source Network Monitoring","mailbox Monitor"]},sidebar:"docs",previous:{title:"Nginx Monitor",permalink:"/docs/help/nginx"},next:{title:"POP3 Monitor",permalink:"/docs/help/pop3"}},m={},p=[{value:"Enable IMAP Service",id:"enable-imap-service",level:3},{value:"Configuration Parameters",id:"configuration-parameters",level:3},{value:"Collection Metrics",id:"collection-metrics",level:3},{value:"Metrics Collection: (Folder Name in Email)",id:"metrics-collection-folder-name-in-email",level:4}],c={toc:p};function g(e){let{components:t,...n}=e;return(0,a.yg)("wrapper",(0,r.A)({},c,n,{components:t,mdxType:"MDXLayout"}),(0,a.yg)("blockquote",null,(0,a.yg)("p",{parentName:"blockquote"},"IMAP, or Internet Message Access Protocol, allows you to retrieve detailed information from your email server.\nYou can click on ",(0,a.yg)("inlineCode",{parentName:"p"},"Create New QQ Email Monitoring")," or ",(0,a.yg)("inlineCode",{parentName:"p"},"Create New Netease Email Monitoring")," to configure, or select ",(0,a.yg)("inlineCode",{parentName:"p"},"More Actions")," to import existing configurations.")),(0,a.yg)("h3",{id:"enable-imap-service"},"Enable IMAP Service"),(0,a.yg)("p",null,"If you want to use this monitoring type to monitor your email information, please first enable the IMAP service in your email:"),(0,a.yg)("p",null,"For example, in QQ Mail (other emails are similar):"),(0,a.yg)("ol",null,(0,a.yg)("li",{parentName:"ol"},"Go to ",(0,a.yg)("inlineCode",{parentName:"li"},"Mail Settings")),(0,a.yg)("li",{parentName:"ol"},"Find and enable the ",(0,a.yg)("inlineCode",{parentName:"li"},"IMAP/SMTP option")," in ",(0,a.yg)("inlineCode",{parentName:"li"},"General")),(0,a.yg)("li",{parentName:"ol"},"Obtain the IMAP server domain, port number, whether to use SSL, and authorization code from the help section"),(0,a.yg)("li",{parentName:"ol"},"Use the above information to configure in HertzBeat and collect monitoring metrics")),(0,a.yg)("h3",{id:"configuration-parameters"},"Configuration Parameters"),(0,a.yg)("table",null,(0,a.yg)("thead",{parentName:"table"},(0,a.yg)("tr",{parentName:"thead"},(0,a.yg)("th",{parentName:"tr",align:"left"},"Parameter Name"),(0,a.yg)("th",{parentName:"tr",align:null},"Parameter Help Description"))),(0,a.yg)("tbody",{parentName:"table"},(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:"left"},"Monitoring Host"),(0,a.yg)("td",{parentName:"tr",align:null},"IMAP mail server domain. Note \u26a0\ufe0f do not include protocol headers (e.g., https://, http://).")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:"left"},"Task Name"),(0,a.yg)("td",{parentName:"tr",align:null},"The name that identifies this monitoring task, which needs to be unique.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:"left"},"Enable SSL"),(0,a.yg)("td",{parentName:"tr",align:null},"Whether to enable SSL.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:"left"},"Port"),(0,a.yg)("td",{parentName:"tr",align:null},"The port provided by the website.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:"left"},"Connection Timeout"),(0,a.yg)("td",{parentName:"tr",align:null},"The wait timeout for the port connection, in milliseconds, default is 6000 ms.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:"left"},"IMAP Email Address"),(0,a.yg)("td",{parentName:"tr",align:null},"The email address to be monitored.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:"left"},"Authorization Code"),(0,a.yg)("td",{parentName:"tr",align:null},"The authorization code provided by the email server.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:"left"},"Monitoring Interval"),(0,a.yg)("td",{parentName:"tr",align:null},"The interval time for periodic data collection, in seconds, the minimum interval can be set to 30 seconds.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:"left"},"Binding Tags"),(0,a.yg)("td",{parentName:"tr",align:null},"Classification management tags for monitoring resources.")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:"left"},"Description Notes"),(0,a.yg)("td",{parentName:"tr",align:null},"Additional identification and description notes for this monitoring task, users can leave notes here.")))),(0,a.yg)("h3",{id:"collection-metrics"},"Collection Metrics"),(0,a.yg)("p",null,"Collect information on each folder in the email (custom folders can be configured), as the metrics collected for each folder are the same, only a common set of metrics is listed below"),(0,a.yg)("h4",{id:"metrics-collection-folder-name-in-email"},"Metrics Collection: (Folder Name in Email)"),(0,a.yg)("table",null,(0,a.yg)("thead",{parentName:"table"},(0,a.yg)("tr",{parentName:"thead"},(0,a.yg)("th",{parentName:"tr",align:null},"Metric Name"),(0,a.yg)("th",{parentName:"tr",align:null},"Metric Unit"),(0,a.yg)("th",{parentName:"tr",align:null},"Metric Help Description"))),(0,a.yg)("tbody",{parentName:"table"},(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Total message count"),(0,a.yg)("td",{parentName:"tr",align:null},"None"),(0,a.yg)("td",{parentName:"tr",align:null},"The total number of emails in this folder")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Recent message count"),(0,a.yg)("td",{parentName:"tr",align:null},"None"),(0,a.yg)("td",{parentName:"tr",align:null},"The number of recently received emails in this folder")),(0,a.yg)("tr",{parentName:"tbody"},(0,a.yg)("td",{parentName:"tr",align:null},"Unseen message count"),(0,a.yg)("td",{parentName:"tr",align:null},"None"),(0,a.yg)("td",{parentName:"tr",align:null},"The number of unread emails in this folder")))))}g.isMDXComponent=!0}}]);