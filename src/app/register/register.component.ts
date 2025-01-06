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
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, NgIcon, ReactiveFormsModule, CommonModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  viewProviders: [provideIcons({ gameCat })],
})
export class RegisterComponent {
  registerForm: FormGroup;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
  ) {
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(4)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  onSubmit() {
    if (this.registerForm.valid) {
      const { username, password } = this.registerForm.value;

      // Send a POST request to register
      this.http
        .post('http://localhost:5000/api/auth/register', { username, password })
        .subscribe({
          next: (response: any) => {
            /**
             * Example response:
             * {
             *   "message": "User registered successfully",
             *   "token": "eyJhbGciOiJI...",
             *   "user": { "id": "...", "username": "testuser" }
             * }
             */
            // Store the token in local storage (or session storage)
            localStorage.setItem('authToken', response.token);

            // Redirect to /play
            this.router.navigate(['/play']);
          },
          error: (err) => {
            console.error('Registration failed:', err);
            this.errorMessage =
              err?.error?.message || 'Failed to register. Please try again.';
          },
        });
    } else {
      this.registerForm.markAllAsTouched();
    }
  }

  get username() {
    return this.registerForm.get('username');
  }
  get password() {
    return this.registerForm.get('password');
  }
}
