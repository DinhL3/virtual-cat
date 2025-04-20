import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('authToken');
  const auth = inject(AuthService);
  const router = inject(Router);

  // Check token expiration before sending request
  if (token && auth.isTokenExpired()) {
    // If token is expired, logout and redirect
    auth.logout();
    router.navigate(['/welcome']);
    return next(req);
  }

  if (token) {
    const clonedRequest = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`),
    });
    return next(clonedRequest).pipe(
      catchError((error) => {
        if (error.status === 401) {
          // Unauthorized - token might be expired or invalid
          auth.logout();
          router.navigate(['/welcome']);
        }
        return throwError(() => error);
      }),
    );
  }
  return next(req);
};
