import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-metrics-field-input',
  templateUrl: './metrics-field-input.component.html',
  styleUrls: ['./metrics-field-input.component.less']
})
export class MetricsFieldInputComponent implements OnInit {
  constructor() {}

  @Input() value!: any;
  @Output() readonly valueChange = new EventEmitter<string>();

  @Input()
  FieldAlias: string = 'field';
  @Input()
  UnitAlias: string = 'unit';
  @Input()
  TypeAlias: string = 'type';

  fields: any[] = [];

  ngOnInit(): void {
    if (this.value == undefined) {
      this.fields.push({
        field: '',
        unit: '',
        type: ''
      });
    } else {
      this.value = JSON.parse(this.value);
    }
    if (this.value) {
      for (let item of this.value) {
        this.fields.push({
          field: item.field,
          unit: item.unit,
          type: item.type
        });
      }
    }
  }

  addNew(e?: MouseEvent) {
    if (e) {
      e.preventDefault();
    }
    this.fields.push({
      field: '',
      unit: '',
      type: ''
    });
  }

  removeCurrent(index: number, e?: MouseEvent) {
    if (e) {
      e.preventDefault();
    }
    if (this.fields.length > 1) {
      this.fields.splice(index, 1);
    }
  }

  onChange() {
    this.value = this.fields;
    this.valueChange.emit(JSON.stringify(this.value));
  }
}
