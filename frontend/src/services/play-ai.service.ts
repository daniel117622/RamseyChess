import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, of , firstValueFrom, Observable } from 'rxjs';
import { catchError , tap, map } from 'rxjs/operators';
import { StrategyCardData, StrategyRequest, StrategyDetailResponse } from 'src/models/start-card.model';
import { NextMove } from 'src/models/next-move.model';



@Injectable({
  providedIn: 'root'
})
export class PlayAiService {
  
  constructor(private http: HttpClient) {}

  fetchStrategyCards() {
    return this.http.get<StrategyCardData[]>('/api/get_strategies_expand').pipe(
      tap(response => {
        console.log('Successfully fetched strategy cards:', response);
        response.forEach( (card : StrategyCardData) => {
          let payload = {"strategy_list" : card.strategy_list}
          this.fetchStrategyCardDetails(payload).subscribe( (strategyDetails : StrategyDetailResponse) => {
            card.strategy_details = strategyDetails;
            console.log(`Updated strategy details for card ${card._id}:`, strategyDetails);
          });
      })
        return response
        // Handle success case, e.g., updating local state or triggering other actions
      })
    );
  }

  fetchStrategyCardDetails(payload: StrategyRequest) {
    return this.http.post<StrategyDetailResponse>('/api/get_strategy_detail', payload).pipe(
      tap((response: StrategyDetailResponse) => {
        console.log('Successfully fetched strategy card details:', response);
        
        return response;
      })
    );
  }

  fetchStrategyCardDetailsById(strat_id : string) {
    return this.http.post<StrategyDetailResponse>('/api/get_strategy_detail_by_id', {"strategy_id": strat_id}).pipe(
      tap((response: StrategyDetailResponse) => {
        console.log('Successfully fetched strategy card details:', response);
        
        return response;
      })
    );
  }

  ping() {
    console.log("Play ai running");
  }
  async getNextMoveByStratId(fen: string | null, strategy_id: string | null, depth: number): Promise<NextMove | {}> {
    console.log("Fetching next move for strategy ID:", strategy_id);
    try {
      const nextMove = await firstValueFrom(
        this.http.post<NextMove>('/api/request_move_by_strategy', { fen, strategy_id, depth }).pipe(
          catchError(error => {
            console.error('Error fetching next move', error);
            return of({}); // Return an empty object or handle appropriately
          })
        )
      );
  
      if (Object.keys(nextMove).length === 0) {
        return {best_move : ''} as NextMove;
      }

      return nextMove as NextMove;
    } catch (error) {
      if (error instanceof Error) {
        console.error('Network error or connection issue:', error);
        return {}; // Return null or another appropriate value for connection issues
      }
      throw error; // Propagate other errors
    }
  }

  postWinner(white_strategy: string, black_strategy: string, winner: string): Observable<number | null> {
    // EMPTY STRING MEANS A DRAW
    return this.http
      .post<{ deltaElo?: number }>(
        '/api/post_winner',
        {
          white_strategy,
          black_strategy,
          winner,
        }
      )
      .pipe(
        map((response) => response.deltaElo ?? null)
      );
  }
}