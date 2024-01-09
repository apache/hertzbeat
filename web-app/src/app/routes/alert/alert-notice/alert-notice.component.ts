import { Component, Inject, OnInit } from '@angular/core';
import { I18NService } from '@core';
import { ALAIN_I18N_TOKEN } from '@delon/theme';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs/operators';

import { NoticeReceiver } from '../../../pojo/NoticeReceiver';
import { NoticeRule, TagItem } from '../../../pojo/NoticeRule';
import { NoticeTemplate } from '../../../pojo/NoticeTemplate';
import { NoticeReceiverService } from '../../../service/notice-receiver.service';
import { NoticeRuleService } from '../../../service/notice-rule.service';
import { NoticeTemplateService } from '../../../service/notice-template.service';
import { TagService } from '../../../service/tag.service';

@Component({
  selector: 'app-alert-notice',
  templateUrl: './alert-notice.component.html',
  styles: []
})
export class AlertNoticeComponent implements OnInit {
  receivers!: NoticeReceiver[];
  receiverTableLoading: boolean = true;
  templates: NoticeTemplate[] = [];
  templateTableLoading: boolean = true;
  rules!: NoticeRule[];
  ruleTableLoading: boolean = true;
  loading = false;
  code: string = '';
  originalCode: string = '';
  // start 新增或修改通知接收对象弹出框
  isManageReceiverModalVisible: boolean = false;
  isManageReceiverModalAdd: boolean = true;
  isManageReceiverModalOkLoading: boolean = false;
  isSendTestButtonLoading: boolean = false;
  receiver!: NoticeReceiver;
  isManageTemplateModalVisible: boolean = false;
  isManageTemplateModalAdd: boolean = true;
  isManageTemplateModalOkLoading: boolean = false;
  isShowTemplateModalVisible: boolean = false;
  template: NoticeTemplate = new NoticeTemplate();
  templatesOption: any[] = [];
  isManageRuleModalVisible = false;
  isManageRuleModalAdd: boolean = true;
  isManageRuleModalOkLoading: boolean = false;
  rule: NoticeRule = new NoticeRule();
  switchReceiver!: NoticeReceiver;
  receiversOption: any[] = [];
  searchTag!: string;
  tagsOption: any[] = [];
  filterTags: string[] = [];
  isLimit: boolean = false;
  dayCheckOptions = [
    { label: this.i18nSvc.fanyi('common.week.7'), value: 7, checked: true },
    { label: this.i18nSvc.fanyi('common.week.1'), value: 1, checked: true },
    { label: this.i18nSvc.fanyi('common.week.2'), value: 2, checked: true },
    { label: this.i18nSvc.fanyi('common.week.3'), value: 3, checked: true },
    { label: this.i18nSvc.fanyi('common.week.4'), value: 4, checked: true },
    { label: this.i18nSvc.fanyi('common.week.5'), value: 5, checked: true },
    { label: this.i18nSvc.fanyi('common.week.6'), value: 6, checked: true }
  ];

  constructor(
    private notifySvc: NzNotificationService,
    private noticeReceiverSvc: NoticeReceiverService,
    private modal: NzModalService,
    private noticeTemplateSvc: NoticeTemplateService,
    private noticeRuleSvc: NoticeRuleService,
    private tagService: TagService,
    @Inject(ALAIN_I18N_TOKEN) private i18nSvc: I18NService
  ) {}

  ngOnInit(): void {
    this.loadReceiversTable();
    this.loadRulesTable();
    this.loadTemplatesTable();
  }

  syncReceiver() {
    this.loadReceiversTable();
  }

  syncTemplate() {
    this.loadTemplatesTable();
  }

  syncRule() {
    this.loadRulesTable();
  }

  loadReceiversTable() {
    this.receiverTableLoading = true;
    let receiverInit$ = this.noticeReceiverSvc.getReceivers().subscribe(
      message => {
        this.receiverTableLoading = false;
        if (message.code === 0) {
          this.receivers = message.data;
        } else {
          console.warn(message.msg);
        }
        receiverInit$.unsubscribe();
      },
      error => {
        console.error(error.msg);
        this.receiverTableLoading = false;
        receiverInit$.unsubscribe();
      }
    );
  }

  loadTemplatesTable() {
    this.templateTableLoading = true;
    let templatesInit$ = this.noticeTemplateSvc.getNoticeTemplates().subscribe(
      message => {
        this.templateTableLoading = false;
        if (message.code === 0) {
          this.templates = message.data;
          // this.templates=this.templates.concat(this.defaultTemplates);
        } else {
          console.warn(message.msg);
        }
        templatesInit$.unsubscribe();
      },
      error => {
        console.error(error.msg);
        this.templateTableLoading = false;
        templatesInit$.unsubscribe();
      }
    );
  }

  loadRulesTable() {
    this.ruleTableLoading = true;
    let rulesInit$ = this.noticeRuleSvc.getNoticeRules().subscribe(
      message => {
        this.ruleTableLoading = false;
        if (message.code === 0) {
          this.rules = message.data;
        } else {
          console.warn(message.msg);
        }
        rulesInit$.unsubscribe();
      },
      error => {
        console.error(error.msg);
        this.ruleTableLoading = false;
        rulesInit$.unsubscribe();
      }
    );
  }

  onDeleteOneNoticeReceiver(receiveId: number) {
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.delete'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.deleteOneNoticeReceiver(receiveId)
    });
  }

  deleteOneNoticeReceiver(receiveId: number) {
    const deleteReceiver$ = this.noticeReceiverSvc
      .deleteReceiver(receiveId)
      .pipe(
        finalize(() => {
          deleteReceiver$.unsubscribe();
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.notifySvc.success(this.i18nSvc.fanyi('common.notify.delete-success'), '');
            this.loadReceiversTable();
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), message.msg);
          }
        },
        error => {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), error.msg);
        }
      );
  }

  onDeleteOneNoticeRule(ruleId: number) {
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.delete'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.deleteOneNoticeRule(ruleId)
    });
  }

  onDeleteOneNoticeTemplate(templateId: number) {
    this.modal.confirm({
      nzTitle: this.i18nSvc.fanyi('common.confirm.delete'),
      nzOkText: this.i18nSvc.fanyi('common.button.ok'),
      nzCancelText: this.i18nSvc.fanyi('common.button.cancel'),
      nzOkDanger: true,
      nzOkType: 'primary',
      nzClosable: false,
      nzOnOk: () => this.deleteOneNoticeTemplate(templateId)
    });
  }

  // start 新增或修改通知策略弹出框

  deleteOneNoticeTemplate(templateId: number) {
    const deleteTemplate$ = this.noticeTemplateSvc
      .deleteNoticeTemplate(templateId)
      .pipe(
        finalize(() => {
          deleteTemplate$.unsubscribe();
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.notifySvc.success(this.i18nSvc.fanyi('common.notify.delete-success'), '');
            this.loadTemplatesTable();
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), message.msg);
          }
        },
        error => {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), error.msg);
        }
      );
  }

  deleteOneNoticeRule(ruleId: number) {
    const deleteRule$ = this.noticeRuleSvc
      .deleteNoticeRule(ruleId)
      .pipe(
        finalize(() => {
          deleteRule$.unsubscribe();
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.notifySvc.success(this.i18nSvc.fanyi('common.notify.delete-success'), '');
            this.loadRulesTable();
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), message.msg);
          }
        },
        error => {
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.delete-fail'), error.msg);
        }
      );
  }

  onSplitTokenStr(type: number) {
    let index = -1;
    switch (this.receiver?.type) {
      case 4:
        if (this.receiver?.wechatId) {
          index = this.receiver.wechatId.indexOf('key=');
          if (index > 0) {
            this.receiver.wechatId = this.receiver.wechatId.substring(index + 4);
          }
        }
        break;
      case 5:
        if (this.receiver?.accessToken) {
          index = this.receiver.accessToken.indexOf('access_token=');
          if (index > 0) {
            this.receiver.accessToken = this.receiver.accessToken.substring(index + 13);
          }
        }
        break;
      case 6:
        if (this.receiver?.wechatId) {
          index = this.receiver.wechatId.indexOf('hook');
          if (index > 0) {
            this.receiver.wechatId = this.receiver.wechatId.substring(index + 5);
          }
        }
        break;
    }
  }

  onNewNoticeReceiver() {
    this.receiver = new NoticeReceiver();
    this.isManageReceiverModalVisible = true;
    this.isManageReceiverModalAdd = true;
  }

  onEditOneNoticeReceiver(receiver: NoticeReceiver) {
    this.receiver = receiver;
    this.isManageReceiverModalVisible = true;
    this.isManageReceiverModalAdd = false;
  }

  onSendAlertTestMsg() {
    this.isSendTestButtonLoading = true;
    const sendReq$ = this.noticeReceiverSvc
      .sendAlertMsgToReceiver(this.receiver)
      .pipe(
        finalize(() => {
          sendReq$.unsubscribe();
          this.isSendTestButtonLoading = false;
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.isSendTestButtonLoading = false;
            this.notifySvc.success(this.i18nSvc.fanyi('alert.notice.send-test.notify.success'), '');
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('alert.notice.send-test.notify.failed'), message.msg);
          }
        },
        error => {
          this.isSendTestButtonLoading = false;
          this.notifySvc.error(this.i18nSvc.fanyi('alert.notice.send-test.notify.failed'), error.msg);
        }
      );
  }

  onManageReceiverModalCancel() {
    this.isManageReceiverModalVisible = false;
  }

  onManageReceiverModalOk() {
    this.isManageReceiverModalOkLoading = true;
    if (this.isManageReceiverModalAdd) {
      const modalOk$ = this.noticeReceiverSvc
        .newReceiver(this.receiver)
        .pipe(
          finalize(() => {
            modalOk$.unsubscribe();
            this.isManageReceiverModalOkLoading = false;
          })
        )
        .subscribe(
          message => {
            if (message.code === 0) {
              this.isManageReceiverModalVisible = false;
              this.notifySvc.success(this.i18nSvc.fanyi('common.notify.new-success'), this.i18nSvc.fanyi('alert.notice.receiver.next'), {
                nzDuration: 15000
              });
              this.loadReceiversTable();
            } else {
              this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), message.msg);
            }
          },
          error => {
            this.isManageReceiverModalVisible = false;
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), error.msg);
          }
        );
    } else {
      const modalOk$ = this.noticeReceiverSvc
        .editReceiver(this.receiver)
        .pipe(
          finalize(() => {
            modalOk$.unsubscribe();
            this.isManageReceiverModalOkLoading = false;
          })
        )
        .subscribe(
          message => {
            if (message.code === 0) {
              this.isManageReceiverModalVisible = false;
              this.notifySvc.success(this.i18nSvc.fanyi('common.notify.edit-success'), this.i18nSvc.fanyi('alert.notice.receiver.next'), {
                nzDuration: 15000
              });
              this.loadReceiversTable();
            } else {
              this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), message.msg);
            }
          },
          error => {
            this.isManageReceiverModalVisible = false;
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), error.msg);
          }
        );
    }
  }

  onNewNoticeTemplate() {
    this.template = new NoticeTemplate();
    this.isManageTemplateModalVisible = true;
    this.isManageTemplateModalAdd = true;
  }

  onEditOneNoticeTemplate(template: NoticeTemplate) {
    this.template = template;
    this.isManageTemplateModalVisible = true;
    this.isManageTemplateModalAdd = false;
  }

  onShowOneNoticeTemplate(template: NoticeTemplate) {
    this.template = template;
    this.isShowTemplateModalVisible = true;
  }

  onNewNoticeRule() {
    this.rule = new NoticeRule();
    this.rule.templateId = -1;
    this.templatesOption.push({
      value: -1,
      label: this.i18nSvc.fanyi('alert.notice.template.preset.true')
    });
    this.isLimit = false;
    this.isManageRuleModalVisible = true;
    this.isManageRuleModalAdd = true;
  }

  onEditOneNoticeRule(rule: NoticeRule) {
    this.rule = rule;
    this.isLimit = !(this.rule.days == null || this.rule.days.length == 7);
    this.isManageRuleModalVisible = true;
    this.isManageRuleModalAdd = false;
    this.receiversOption = [];
    this.receiversOption.push({
      value: rule.receiverId,
      label: rule.receiverName
    });
    this.templatesOption = [];
    if (this.rule.templateId && this.rule.templateName) {
      this.templatesOption.push({
        value: rule.templateId,
        label: rule.templateName
      });
    } else {
      this.rule.templateId = -1;
      this.templatesOption.push({
        value: -1,
        label: this.i18nSvc.fanyi('alert.notice.template.preset.true')
      });
    }
    this.filterTags = [];
    if (rule.tags != undefined) {
      rule.tags.forEach(item => {
        let tag = `${item.name}`;
        if (item.value != undefined) {
          tag = `${tag}:${item.value}`;
        }
        this.filterTags.push(tag);
        this.tagsOption.push({
          value: tag,
          label: tag
        });
      });
    }
  }

  onNoticeRuleDaysChange(value: any[]) {
    this.rule.days = value
      .filter(item => item.checked == true)
      .map(item => item.value)
      .concat();
  }

  onNoticeRuleLimitChange(limit: boolean) {
    if (!limit) {
      this.rule.days = this.dayCheckOptions.map(item => item.value).concat();
    } else {
      this.rule.days = this.dayCheckOptions
        .filter(item => item.checked)
        .map(item => item.value)
        .concat();
    }
  }

  onSwitchReceiver() {
    this.receiversOption.forEach(option => {
      if (option.value == this.rule.receiverId) {
        this.switchReceiver = option.receiver;
      }
    });
    this.rule.templateId = -1;
  }

  loadReceiversOption() {
    let receiverOption$ = this.noticeReceiverSvc.getReceivers().subscribe(
      message => {
        if (message.code === 0) {
          let data = message.data;
          this.receiversOption = [];
          if (data != undefined) {
            data.forEach(item => {
              let label = `${item.name}-`;
              switch (item.type) {
                case 0:
                  label = `${label}Phone`;
                  break;
                case 1:
                  label = `${label}Email`;
                  break;
                case 2:
                  label = `${label}WebHook`;
                  break;
                case 3:
                  label = `${label}WeChat`;
                  break;
                case 4:
                  label = `${label}WeWork`;
                  break;
                case 5:
                  label = `${label}DingDing`;
                  break;
                case 6:
                  label = `${label}FeiShu`;
                  break;
                case 7:
                  label = `${label}TelegramBot`;
                  break;
                case 8:
                  label = `${label}SlackWebHook`;
                  break;
                case 9:
                  label = `${label}Discord Bot`;
                  break;
                case 10:
                  label = `${label}WeChatApp`;
                  break;
                case 11:
                  label = `${label}SMN`;
                  break;
                case 12:
                  label = `${label}ServerChan`;
                  break;
              }
              this.receiversOption.push({
                value: item.id,
                label: label,
                receiver: item
              });
            });
          }
        } else {
          console.warn(message.msg);
        }
        receiverOption$.unsubscribe();
      },
      error => {
        console.error(error.msg);
        receiverOption$.unsubscribe();
      }
    );
  }

  loadTemplatesOption() {
    let templateOption$ = this.noticeTemplateSvc.getNoticeTemplates().subscribe(
      message => {
        if (message.code === 0) {
          let data = message.data;
          this.templatesOption = [];
          if (data != undefined) {
            let index = -1;
            data.forEach(item => {
              if (this.switchReceiver) {
                if (this.switchReceiver.type == item.type) {
                  this.templatesOption.push({
                    value: item.id == null ? -1 : item.id,
                    label: item.id == null ? this.i18nSvc.fanyi('alert.notice.template.preset.true') : item.name
                  });
                }
              } else {
                this.templatesOption.push({
                  value: item.id == null ? index-- : item.id,
                  label: item.name
                });
              }
            });
          }
        } else {
          console.warn(message.msg);
        }
        templateOption$.unsubscribe();
      },
      error => {
        console.error(error.msg);
        templateOption$.unsubscribe();
      }
    );
  }

  loadTagsOption() {
    let tagsInit$ = this.tagService.loadTags(this.searchTag, undefined, 0, 1000).subscribe(
      message => {
        if (message.code === 0) {
          let page = message.data;
          this.tagsOption = [];
          if (page.content != undefined) {
            page.content.forEach(item => {
              let tag = `${item.name}`;
              if (item.value != undefined) {
                tag = `${tag}:${item.value}`;
              }
              this.tagsOption.push({
                value: tag,
                label: tag
              });
            });
          }
        } else {
          console.warn(message.msg);
        }
        tagsInit$.unsubscribe();
      },
      error => {
        tagsInit$.unsubscribe();
        console.error(error.msg);
      }
    );
  }

  onPrioritiesChange() {
    if (this.rule.priorities != undefined) {
      let isAll = false;
      this.rule.priorities.forEach(item => {
        if (item == 9) {
          isAll = true;
        }
      });
      if (isAll) {
        this.rule.priorities = [9, 0, 1, 2];
      }
    }
  }

  onManageRuleModalCancel() {
    this.isManageRuleModalVisible = false;
  }

  onManageTemplateModalCancel() {
    this.isManageTemplateModalVisible = false;
    this.isShowTemplateModalVisible = false;
  }

  updateNoticeRule(noticeRule: NoticeRule) {
    this.ruleTableLoading = true;
    const updateNoticeRule$ = this.noticeRuleSvc
      .editNoticeRule(noticeRule)
      .pipe(
        finalize(() => {
          updateNoticeRule$.unsubscribe();
          this.ruleTableLoading = false;
        })
      )
      .subscribe(
        message => {
          if (message.code === 0) {
            this.notifySvc.success(this.i18nSvc.fanyi('common.notify.edit-success'), '');
          } else {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), message.msg);
          }
          this.loadRulesTable();
          this.ruleTableLoading = false;
        },
        error => {
          this.ruleTableLoading = false;
          this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), error.msg);
        }
      );
  }

  onManageRuleModalOk() {
    this.receiversOption.forEach(option => {
      if (option.value == this.rule.receiverId) {
        this.rule.receiverName = option.label;
      }
    });
    // template model
    if (this.rule.templateId != null && this.rule.templateId >= 0) {
      this.templatesOption.forEach(option => {
        if (option.value == this.rule.templateId) {
          this.rule.templateName = option.label;
        }
      });
    } else {
      this.rule.templateId = null;
      this.rule.templateName = null;
    }
    this.rule.tags = [];
    this.filterTags.forEach(tag => {
      let tmp: string[] = tag.split(':');
      let tagItem = new TagItem();
      if (tmp.length == 1) {
        tagItem.name = tmp[0];
        this.rule.tags.push(tagItem);
      } else if (tmp.length == 2) {
        tagItem.name = tmp[0];
        tagItem.value = tmp[1];
        this.rule.tags.push(tagItem);
      }
    });
    if (this.rule.priorities != undefined) {
      this.rule.priorities = this.rule.priorities.filter(item => item != null && item != 9);
    }
    this.isManageRuleModalOkLoading = true;
    if (this.isManageRuleModalAdd) {
      const modalOk$ = this.noticeRuleSvc
        .newNoticeRule(this.rule)
        .pipe(
          finalize(() => {
            modalOk$.unsubscribe();
            this.isManageRuleModalOkLoading = false;
          })
        )
        .subscribe(
          message => {
            if (message.code === 0) {
              this.isManageRuleModalVisible = false;
              this.notifySvc.success(this.i18nSvc.fanyi('common.notify.new-success'), '');
              this.loadRulesTable();
            } else {
              this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), message.msg);
            }
          },
          error => {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), error.msg);
          }
        );
    } else {
      const modalOk$ = this.noticeRuleSvc
        .editNoticeRule(this.rule)
        .pipe(
          finalize(() => {
            modalOk$.unsubscribe();
            this.isManageRuleModalOkLoading = false;
          })
        )
        .subscribe(
          message => {
            if (message.code === 0) {
              this.isManageRuleModalVisible = false;
              this.notifySvc.success(this.i18nSvc.fanyi('common.notify.edit-success'), '');
              this.loadRulesTable();
            } else {
              this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), message.msg);
            }
          },
          error => {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), error.msg);
          }
        );
    }
  }

  onManageTemplateModalOk() {
    this.isManageTemplateModalOkLoading = true;
    if (this.isManageTemplateModalAdd) {
      this.template.preset = false;
      const modalOk$ = this.noticeTemplateSvc
        .newNoticeTemplate(this.template)
        .pipe(
          finalize(() => {
            modalOk$.unsubscribe();
            this.isManageTemplateModalOkLoading = false;
          })
        )
        .subscribe(
          message => {
            if (message.code === 0) {
              this.isManageTemplateModalVisible = false;
              this.notifySvc.success(this.i18nSvc.fanyi('common.notify.new-success'), '');
              this.loadTemplatesTable();
            } else {
              this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), message.msg);
            }
          },
          error => {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.new-fail'), error.msg);
          }
        );
    } else {
      const modalOk$ = this.noticeTemplateSvc
        .editNoticeTemplate(this.template)
        .pipe(
          finalize(() => {
            modalOk$.unsubscribe();
            this.isManageTemplateModalOkLoading = false;
          })
        )
        .subscribe(
          message => {
            if (message.code === 0) {
              this.isManageTemplateModalVisible = false;
              this.notifySvc.success(this.i18nSvc.fanyi('common.notify.edit-success'), '');
              this.loadTemplatesTable();
            } else {
              this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), message.msg);
            }
          },
          error => {
            this.notifySvc.error(this.i18nSvc.fanyi('common.notify.edit-fail'), error.msg);
          }
        );
    }
  }
}
