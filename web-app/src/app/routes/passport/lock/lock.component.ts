import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SettingsService, User } from '@delon/theme';

@Component({
  selector: 'passport-lock',
  templateUrl: './lock.component.html',
  styleUrls: ['./lock.component.less']
})
export class UserLockComponent {
  f: FormGroup;

  get user(): User {
    return this.settings.user;
  }

  constructor(fb: FormBuilder, private settings: SettingsService, private router: Router) {
    this.f = fb.group({
      password: [null, Validators.required]
    });
  }

  submit(): void {
    for (const i in this.f.controls) {
      this.f.controls[i].markAsDirty();
      this.f.controls[i].updateValueAndValidity();
    }
    if (this.f.valid) {
      this.router.navigate(['dashboard']);
    }
  }
}
