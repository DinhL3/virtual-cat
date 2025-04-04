// src/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';

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
  private baseUrl = 'http://localhost:5001/api/auth';
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

  isLoggedIn(): boolean {
    const token = this.getToken();
    const user = this.getUser();
    return !!(token && user);
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
