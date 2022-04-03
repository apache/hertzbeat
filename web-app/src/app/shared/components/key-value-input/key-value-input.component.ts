import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-key-value-input',
  templateUrl: './key-value-input.component.html',
  styleUrls: ['./key-value-input.component.less']
})
export class KeyValueInputComponent implements OnInit {
  constructor() {}

  @Input() value!: any;
  @Output() readonly valueChange = new EventEmitter<string>();

  @Input()
  keyAlias: string = 'Key';
  @Input()
  valueAlias: string = 'Value';

  keyValues: any[] = [];

  ngOnInit(): void {
    if (this.value == undefined) {
      this.value = {
        '': ''
      };
    } else {
      this.value = JSON.parse(this.value);
    }
    Object.keys(this.value).map(item => {
      this.keyValues.push({
        key: item,
        value: this.value[item]
      });
    });
  }

  addNew(e?: MouseEvent) {
    if (e) {
      e.preventDefault();
    }
    this.keyValues.push({
      key: '',
      value: ''
    });
  }
  removeCurrent(index: number, e?: MouseEvent) {
    if (e) {
      e.preventDefault();
    }
    if (this.keyValues.length > 1) {
      this.keyValues.splice(index, 1);
    }
  }
  onChange() {
    this.value = {};
    this.keyValues.forEach(item => {
      if (item != null && item.key != null) {
        this.value[item.key] = item.value;
      }
    });
    this.valueChange.emit(JSON.stringify(this.value));
  }
}
