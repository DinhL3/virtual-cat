// cat.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Cat } from '../models/cat.model';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class CatService {
  private apiUrl = 'http://localhost:5000/api/cats';

  constructor(
    private http: HttpClient,
    private router: Router,
    private auth: AuthService,
  ) {}

  private handleError(error: HttpErrorResponse) {
    // Only handle auth errors here, let the component handle other errors
    if (error.status === 401) {
      this.auth.logout();
      this.router.navigate(['/login']);
      return throwError(() => error);
    }
    return throwError(() => error);
  }

  getUserCat(): Observable<Cat | null> {
    return this.http
      .get<Cat | null>(`${this.apiUrl}/my-cat`)
      .pipe(catchError((error) => this.handleError(error)));
  }

  adoptCat(catData: Partial<Cat>): Observable<Cat> {
    return this.http
      .post<Cat>(`${this.apiUrl}/adopt`, catData)
      .pipe(catchError((error) => this.handleError(error)));
  }
}
