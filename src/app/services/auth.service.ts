import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  _id: string;
  username: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private baseUrl = `${environment.apiUrl}/auth`;
  private currentUser: User | null = null;

  constructor(private http: HttpClient) {
    this.loadStoredUser();
  }

  private loadStoredUser(): void {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('authToken');
    if (userStr && token) {
      try {
        this.currentUser = JSON.parse(userStr);
      } catch (e) {
        this.logout();
      }
    }
  }

  register(username: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/register`, { username, password })
      .pipe(
        tap((response) => this.handleAuthResponse(response)),
        catchError((error) => {
          this.handleError(error);
          return throwError(() => error);
        }),
      );
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/login`, { username, password })
      .pipe(
        tap((response) => this.handleAuthResponse(response)),
        catchError((error) => {
          this.handleError(error);
          return throwError(() => error);
        }),
      );
  }

  private handleAuthResponse(response: AuthResponse): void {
    if (!response.token || !response.user) {
      console.error('Invalid auth response:', response);
      return;
    }
    this.setToken(response.token);
    this.setUser(response.user);
  }

  private handleError(error: any): void {
    if (error.status === 401) {
      this.logout();
    }
  }

  setToken(token: string): void {
    if (!token) return;
    localStorage.setItem('authToken', token);
  }

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  setUser(user: User): void {
    if (!user) return;
    this.currentUser = user;
    localStorage.setItem('user', JSON.stringify(user));
  }

  getUser(): User | null {
    return this.currentUser;
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    this.currentUser = null;
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      // JWT tokens are base64 encoded with 3 parts: header.payload.signature
      const payload = token.split('.')[1];
      const decodedPayload = JSON.parse(atob(payload));

      // Check if exp (expiration timestamp) exists and is valid
      if (!decodedPayload.exp) return false;

      // Compare expiration timestamp with current time (in seconds)
      const expiry = decodedPayload.exp * 1000; // Convert to milliseconds
      return expiry < Date.now();
    } catch (e) {
      // If token can't be parsed, consider it expired
      console.error('Error parsing JWT token:', e);
      return true;
    }
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    const user = this.getUser();
    return !!(token && user && !this.isTokenExpired());
  }

  refreshUserData(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/me`).pipe(
      tap((user) => this.setUser(user)),
      catchError((error) => {
        this.handleError(error);
        return throwError(() => error);
      }),
    );
  }
}
