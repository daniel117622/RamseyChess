import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, of , firstValueFrom, Observable } from 'rxjs';
import { catchError , tap, map } from 'rxjs/operators';
import { StrategyCardData, StrategyRequest, StrategyDetailResponse } from 'src/models/start-card.model';
import { NextMove } from 'src/models/next-move.model';
import { WebSocketSubject } from 'rxjs/webSocket';
import { Subject } from 'rxjs'
import { io, Socket } from 'socket.io-client';


@Injectable({
  providedIn: 'root'
})
export class PlayAiService {
  private socket: Socket | null = null;
  public  gameMoves$: Subject<any> = new Subject();

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
  async getNextMoveByStratId(
    fen: string | null, 
    white_strategy_id: string | null, 
    depth: number
  ): Promise<NextMove | {}> {
    const black_strategy_id = '671afaa69eb0593a9dea2024'; // Default black strategy
  
    console.log("Fetching next move for white strategy ID:", white_strategy_id);
  
    try {
      const nextMove = await firstValueFrom(
        this.http.post<NextMove>('/api/request_move_by_strategy', {
          fen,
          white_strategy: white_strategy_id,
          black_strategy: black_strategy_id,
          depth
        }).pipe(
          catchError(error => {
            console.error('Error fetching next move', error);
            return of({}); 
          })
        )
      );
  
      if (Object.keys(nextMove).length === 0) {
        return { best_move: '' } as NextMove;
      }
  
      return nextMove as NextMove;
    } catch (error) {
      if (error instanceof Error) 
      {
        console.error('Network error or connection issue:', error);
        return {}; 
      }
      throw error; 
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

  listenForMoves(whiteStrategyId: string, blackStrategyId: string, debug: boolean): Observable<any> 
  {
      if (this.socket) 
      {
          console.warn('Socket.IO connection is already active.');
          return this.createMoveObservable(); // Return existing observable if already connected
      }

      // Construct the WebSocket connection URL dynamically
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host; // Use current host (adjust if needed)
      const socketUrl = `${protocol}//${host}`;

      this.socket = io(socketUrl, 
      {
          path: '/socket.io', // Ensure correct server path
          transports: ['websocket'], // Force WebSocket transport
      });

      // Emit the execute_game event with required parameters (fen and depth are removed)
      this.socket.emit('execute_game', 
      {
          white_strategy: whiteStrategyId,
          black_strategy: blackStrategyId
      });

      return this.createMoveObservable();
  }
  
  private createMoveObservable(): Observable<any> 
  {
      if (!this.socket) 
      {
          throw new Error('Socket.IO connection is not initialized.');
      }
  
      return new Observable((observer) => 
      {
          // Listen for the 'move' event
          this.socket?.on('move', (data : any) => 
          {
              observer.next(data); // Emit the move data to subscribers
          });
  
          // Listen for the 'game_end' event
          this.socket?.on('game_end', (data : any) => 
          {
              observer.next(data); // Emit the game-end data to subscribers
              observer.complete(); // Complete the observable
          });
  
          // Handle socket disconnection
          this.socket?.on('disconnect', () => 
          {
              console.warn('Socket.IO connection disconnected.');
              observer.complete(); // Complete the observable
          });
  
          return () => 
          {
              // Cleanup when the observable is unsubscribed
              this.socket?.disconnect();
              this.socket = null;
          };
      });
  }
  


  
}