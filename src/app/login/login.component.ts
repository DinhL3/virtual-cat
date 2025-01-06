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
      const { username, password } = this.loginForm.value;

      this.http
        .post('http://localhost:5000/api/auth/login', { username, password })
        .subscribe({
          next: (response: any) => {
            /**
             * Example of what your login endpoint might return:
             * {
             *   "message": "Login successful",
             *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
             *   "user": { "id": "...", "username": "testuser" }
             * }
             */
            localStorage.setItem('authToken', response.token);

            // Navigate to '/play' on successful login
            this.router.navigate(['/play']);
          },
          error: (err) => {
            console.error('Login failed:', err);
            this.errorMessage =
              err?.error?.message || 'Login failed. Please try again.';
          },
        });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}
