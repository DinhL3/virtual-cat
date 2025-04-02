import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface GameSaveResponse {
  hasSave: boolean;
  saveData: any | null;
}

interface GameLoadResponse {
  message: string;
  gameSave: any;
}

interface NewGameResponse {
  message: string;
  gameSave: any;
}

@Injectable({
  providedIn: 'root',
})
export class GameService {
  private apiUrl = `http://localhost:5001/api/game`;

  constructor(private http: HttpClient) {}

  /**
   * Check if the user has an existing game save
   */
  checkGameSave(): Observable<GameSaveResponse> {
    return this.http.get<GameSaveResponse>(`${this.apiUrl}/check`);
  }

  /**
   * Load an existing game save
   */
  loadGame(): Observable<GameLoadResponse> {
    return this.http.get<GameLoadResponse>(`${this.apiUrl}/load`);
  }

  /**
   * Create a new game
   * @param characterName The name of the character
   */
  newGame(characterName: string): Observable<NewGameResponse> {
    return this.http.post<NewGameResponse>(`${this.apiUrl}/new`, {
      characterName,
    });
  }
}
