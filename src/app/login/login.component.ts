import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { gameCat } from '@ng-icons/game-icons';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { delay } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, NgIcon, ReactiveFormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  viewProviders: [provideIcons({ gameCat })],
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage = '';
  loading = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.loading = true;
      this.loginForm.disable();

      this.http
        .post('http://localhost:5000/api/auth/login', this.loginForm.value)
        .pipe(delay(2000))
        .subscribe({
          next: (response: any) => {
            localStorage.setItem('authToken', response.token);
            this.router.navigate(['/play']);
          },
          error: (err) => {
            this.errorMessage =
              err?.error?.message || 'Login failed. Please try again.';
            this.loading = false;
            this.loginForm.enable();
          },
          complete: () => {
            this.loginForm.enable();
            this.loading = false;
          },
        });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}
