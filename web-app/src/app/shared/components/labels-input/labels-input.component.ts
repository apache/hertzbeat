import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';

interface KeyValuePair {
  key: string;
  value: string;
}

@Component({
  selector: 'app-labels-input',
  templateUrl: './labels-input.component.html',
  styleUrl: './labels-input.component.less'
})
export class LabelsInputComponent implements OnInit {
  constructor() {}

  @Input() value!: Record<string, string>;
  @Output() readonly valueChange = new EventEmitter<Record<string, string>>();

  @Input() keyAlias: string = 'Key';
  @Input() valueAlias: string = 'Value';

  keyValues: KeyValuePair[] = [];

  ngOnInit(): void {
    this.keyValues = Object.entries(this.value || {}).map(([key, value]) => ({
      key,
      value
    }));

    if (this.keyValues.length === 0) {
      this.addNew();
    }
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
    const result: Record<string, string> = {};
    this.keyValues.forEach(item => {
      if (item.key?.trim()) {
        result[item.key] = item.value || '';
      }
    });
    this.valueChange.emit(result);
  }
}
