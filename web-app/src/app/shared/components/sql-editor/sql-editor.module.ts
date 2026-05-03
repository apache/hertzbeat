import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzCodeEditorModule } from 'ng-zorro-antd/code-editor';

import { SqlEditorComponent } from './sql-editor.component';

@NgModule({
  imports: [CommonModule, FormsModule, NzCodeEditorModule],
  declarations: [SqlEditorComponent],
  exports: [SqlEditorComponent]
})
export class SqlEditorModule {}
