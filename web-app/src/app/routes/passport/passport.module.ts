import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { LayoutModule } from '../../layout/layout.module';
import { SharedModule } from '../../shared/shared.module';
import { UserLockComponent } from './lock/lock.component';
import { UserLoginComponent } from './login/login.component';
import { PassportRoutingModule } from './passport-routing.module';

@NgModule({
  imports: [CommonModule, SharedModule, LayoutModule, PassportRoutingModule],
  declarations: [UserLoginComponent, UserLockComponent]
})
export class PassportModule {}
