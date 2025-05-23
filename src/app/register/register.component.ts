import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { CatAnimationComponent } from '../cat-animation/cat-animation.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    CommonModule,
    CatAnimationComponent,
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent {
  registerForm: FormGroup;
  errorMessage = '';
  loading = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
  ) {
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(4)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.loading = true;
      this.registerForm.disable();

      const { username, password } = this.registerForm.value;

      this.auth.register(username, password).subscribe({
        next: (response) => {
          if (response.token && response.user) {
            // Ensure token is set before navigation
            setTimeout(() => {
              this.router.navigate(['/main-menu']);
            }, 100);
          } else {
            this.errorMessage = 'Registration successful but login failed';
            this.loading = false;
            this.registerForm.enable();
          }
        },
        error: (err) => {
          console.error('Registration failed:', err);
          this.errorMessage =
            err?.error?.message || 'Failed to register. Please try again.';
          this.loading = false;
          this.registerForm.enable();
        },
        complete: () => {
          this.registerForm.enable();
          this.loading = false;
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
