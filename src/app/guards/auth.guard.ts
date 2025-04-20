import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    // If token is expired, the isLoggedIn() will return false
    // We should explicitly log the user out to clear any stale data
    auth.logout();
    router.navigate(['/welcome']);
    return false;
  }

  return true;
};
