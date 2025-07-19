import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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
  private apiUrl = `${environment.apiUrl}/game`;

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

  /**
   * Update the game money
   * @param money The amount of money to update
   */
  updateGameMoney(money: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/update`, { money });
  }
}
