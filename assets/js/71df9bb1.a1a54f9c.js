"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[67167],{15680:(e,t,o)=>{o.d(t,{xA:()=>h,yg:()=>f});var a=o(96540);function r(e,t,o){return t in e?Object.defineProperty(e,t,{value:o,enumerable:!0,configurable:!0,writable:!0}):e[t]=o,e}function n(e,t){var o=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),o.push.apply(o,a)}return o}function i(e){for(var t=1;t<arguments.length;t++){var o=null!=arguments[t]?arguments[t]:{};t%2?n(Object(o),!0).forEach((function(t){r(e,t,o[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(o)):n(Object(o)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(o,t))}))}return e}function l(e,t){if(null==e)return{};var o,a,r=function(e,t){if(null==e)return{};var o,a,r={},n=Object.keys(e);for(a=0;a<n.length;a++)o=n[a],t.indexOf(o)>=0||(r[o]=e[o]);return r}(e,t);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);for(a=0;a<n.length;a++)o=n[a],t.indexOf(o)>=0||Object.prototype.propertyIsEnumerable.call(e,o)&&(r[o]=e[o])}return r}var c=a.createContext({}),s=function(e){var t=a.useContext(c),o=t;return e&&(o="function"==typeof e?e(t):i(i({},t),e)),o},h=function(e){var t=s(e.components);return a.createElement(c.Provider,{value:t},e.children)},p={inlineCode:"code",wrapper:function(e){var t=e.children;return a.createElement(a.Fragment,{},t)}},d=a.forwardRef((function(e,t){var o=e.components,r=e.mdxType,n=e.originalType,c=e.parentName,h=l(e,["components","mdxType","originalType","parentName"]),d=s(o),f=r,g=d["".concat(c,".").concat(f)]||d[f]||p[f]||n;return o?a.createElement(g,i(i({ref:t},h),{},{components:o})):a.createElement(g,i({ref:t},h))}));function f(e,t){var o=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var n=o.length,i=new Array(n);i[0]=d;var l={};for(var c in t)hasOwnProperty.call(t,c)&&(l[c]=t[c]);l.originalType=e,l.mdxType="string"==typeof e?e:r,i[1]=l;for(var s=2;s<n;s++)i[s]=o[s];return a.createElement.apply(null,i)}return a.createElement.apply(null,o)}d.displayName="MDXCreateElement"},66192:(e,t,o)=>{o.r(t),o.d(t,{assets:()=>c,contentTitle:()=>i,default:()=>p,frontMatter:()=>n,metadata:()=>l,toc:()=>s});var a=o(58168),r=(o(96540),o(15680));const n={id:"alert_slack",title:"Alert Slack Webhook Notifications",sidebar_label:"Alert Slack Webhook Notification",keywords:["open source monitoring tool","open source alerter","open source slack webhook notification"]},i=void 0,l={unversionedId:"help/alert_slack",id:"help/alert_slack",title:"Alert Slack Webhook Notifications",description:"Send an alarm message after the threshold is triggered, and notify the recipient through the Slack Webhook.",source:"@site/docs/help/alert_slack.md",sourceDirName:"help",slug:"/help/alert_slack",permalink:"/docs/help/alert_slack",draft:!1,editUrl:"https://github.com/apache/hertzbeat/edit/master/home/docs/help/alert_slack.md",tags:[],version:"current",frontMatter:{id:"alert_slack",title:"Alert Slack Webhook Notifications",sidebar_label:"Alert Slack Webhook Notification",keywords:["open source monitoring tool","open source alerter","open source slack webhook notification"]},sidebar:"docs",previous:{title:"Alert Discord bot notification",permalink:"/docs/help/alert_discord"},next:{title:"Alert Telegram bot notification",permalink:"/docs/help/alert_telegram"}},c={},s=[{value:"Steps",id:"steps",level:2},{value:"Open Webhook in Slack, get Webhook URL",id:"open-webhook-in-slack-get-webhook-url",level:3},{value:"Add an alarm notifier to HertzBeat, and the notification method is Slack Webhook",id:"add-an-alarm-notifier-to-hertzbeat-and-the-notification-method-is-slack-webhook",level:3},{value:"Slack Notification FAQ",id:"slack-notification-faq",level:3}],h={toc:s};function p(e){let{components:t,...n}=e;return(0,r.yg)("wrapper",(0,a.A)({},h,n,{components:t,mdxType:"MDXLayout"}),(0,r.yg)("blockquote",null,(0,r.yg)("p",{parentName:"blockquote"},"Send an alarm message after the threshold is triggered, and notify the recipient through the Slack Webhook.")),(0,r.yg)("h2",{id:"steps"},"Steps"),(0,r.yg)("h3",{id:"open-webhook-in-slack-get-webhook-url"},"Open Webhook in Slack, get Webhook URL"),(0,r.yg)("p",null,"Refer to the official website document ",(0,r.yg)("a",{parentName:"p",href:"https://api.slack.com/messaging/webhooks"},"Sending messages using Incoming Webhooks")),(0,r.yg)("h3",{id:"add-an-alarm-notifier-to-hertzbeat-and-the-notification-method-is-slack-webhook"},"Add an alarm notifier to HertzBeat, and the notification method is Slack Webhook"),(0,r.yg)("ol",null,(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("strong",{parentName:"li"},"\u3010Alarm Notification\u3011->\u3010Add Recipient\u3011->\u3010Select Slack Webhook Notification Method\u3011->\u3010Set Webhook URL\u3011-> \u3010OK\u3011"))),(0,r.yg)("p",null,(0,r.yg)("img",{alt:"email",src:o(62110).A,width:"3782",height:"1002"})),(0,r.yg)("ol",{start:4},(0,r.yg)("li",{parentName:"ol"},(0,r.yg)("strong",{parentName:"li"},"Configure the associated alarm notification strategy\u26a0\ufe0f ","[Add notification strategy]"," -> ","[Associate the recipient just set]"," -> ","[OK]"))),(0,r.yg)("blockquote",null,(0,r.yg)("p",{parentName:"blockquote"},(0,r.yg)("strong",{parentName:"p"},"Note \u26a0\ufe0f Adding a new recipient does not mean that it has taken effect and can receive alarm information. It is also necessary to configure the associated alarm notification strategy, that is, specify which messages are sent to which recipients"),".")),(0,r.yg)("p",null,(0,r.yg)("img",{alt:"email",src:o(82174).A,width:"3778",height:"1284"})),(0,r.yg)("h3",{id:"slack-notification-faq"},"Slack Notification FAQ"),(0,r.yg)("ol",null,(0,r.yg)("li",{parentName:"ol"},"Slack did not receive the robot warning notification")),(0,r.yg)("blockquote",null,(0,r.yg)("p",{parentName:"blockquote"},"Please check whether the alarm information has been triggered in the alarm center",(0,r.yg)("br",{parentName:"p"}),"\n","Please check whether the slack webhook url are configured correctly, and whether the alarm policy association has been configured   ")),(0,r.yg)("p",null,"Other questions can be fed back through the communication group ISSUE!"))}p.isMDXComponent=!0},82174:(e,t,o)=>{o.d(t,{A:()=>a});const a=o.p+"assets/images/alert-notice-policy-a44e898a35d581c7bb8f52bd2499387f.png"},62110:(e,t,o)=>{o.d(t,{A:()=>a});const a=o.p+"assets/images/slack-bot-1-5cc584b2823e4afd5adee02aea2fb1ca.png"}}]);