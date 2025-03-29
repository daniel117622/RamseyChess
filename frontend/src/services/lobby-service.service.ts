import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable } from 'rxjs';

interface Player {
  name              : string;
  ready             : boolean;
  color            ?: string;
  selected_strategy?: string;
}

export interface Lobby {
  id     : string;
  players: Player[];
  status : string;
}

@Injectable({
  providedIn: 'root'
})
export class LobbyService 
{
  private socket: Socket | null                = null;
  public  isGameInitiator                      = false;
  private lobbyState$: BehaviorSubject<Lobby[]> = new BehaviorSubject<Lobby[]>([]);
  
  initializeSocket(): Promise<void> 
  {
    return new Promise<void>((resolve, reject) => 
    {
      if (this.socket) 
      {
        console.warn('Socket.IO connection is already initialized.');
        resolve();  // Resolve immediately if already initialized
        return;
      }
  
      const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
      const host = window.location.host;
      const socketUrl = `${protocol}//${host}`;
  
      this.socket = io(socketUrl, 
      {
        path: '/socket.io',
        transports: ['websocket']
      });
  
      // Listen for 'connect' event to ensure the socket is connected
      this.socket.on('connect', () => 
      {
        console.log('Socket.IO connection established');
        resolve();  // Resolve the promise when connected
      });
  
      // Listen for connection error and reject if any issues occur
      this.socket.on('connect_error', (error) => 
      {
        console.error('Socket.IO connection error:', error);
        reject(new Error('Socket.IO connection failed'));
      });
    });
  }
  
  emitJoinLobby(lobbyId: string, playerName: string): void 
  {
    if (!this.socket) 
    {
      console.error('Socket.IO connection is not initialized.');
      return;
    }
    this.socket.emit('playerjoin', { lobbyId, name: playerName });
  }


  emitReadySignal (readyState: boolean, lobbyId: string, playerName: string, strategy_id : string): void 
  {
    if (!this.socket) 
    {
      console.error('Socket.IO connection is not initialized.');
      return;
    }
    this.socket.emit('playerReady', { ready: readyState , name : playerName , lobbyId: lobbyId, selected_strategy : strategy_id});
  }

  emitForceGameStart(lobbyId: string, playerName : string): void 
  {
    if (!this.socket) 
    {
      console.error('Socket.IO connection is not initialized.');
      return;
    }
  
    if (!lobbyId) 
    {
      console.error('Lobby ID is required to force game start.');
      return;
    }
  
    this.socket.emit('forceGameStart', { lobbyId: lobbyId , player: playerName});
    this.isGameInitiator = true
  }


  onPlayerJoined(): Observable<{ players: { name: string; color: string }[] }> 
  {
    if (!this.socket) 
    {
      throw new Error('Socket.IO connection is not initialized.');
    }
  
    return new Observable((observer) => 
    {
      this.socket?.on('playerJoined', (data: { players: { name: string; color: string }[] }) => 
      {
        console.log('Received playerJoined event:', data); 
        observer.next(data);
      });
  
      return () => 
      {
        this.socket?.off('playerJoined');
      };
    });
  }

  onPlayerLeft(): Observable<{ players: { name: string; color: string }[] }> 
  {
      if (!this.socket) 
      {
          throw new Error('Socket.IO connection is not initialized.');
      }
  
      return new Observable((observer) => 
      {
          this.socket?.on('playerLeft', (data: { players: { name: string; color: string }[] }) => 
          {
              console.log('Received playerLeft event:', data);
              observer.next(data);
          });
  
          return () => 
          {
              this.socket?.off('playerLeft');
          };
      });
  }

  onPlayerReadyUpdate(): Observable<{ players: { name: string, ready: boolean }[] }> 
  {
    if (!this.socket) 
    {
      throw new Error('Socket.IO connection is not initialized.');
    }
  
    return new Observable((observer) => 
    {
      this.socket?.on('playerReadyUpdate', (data: { players: { name: string, ready: boolean }[] }) => 
      {
        console.log('Received playerReadyUpdate event:', data);
        observer.next(data); // Pass the data to the observer
      });
  
      return () => 
      {
        this.socket?.off('playerReadyUpdate');
      };
    });
  }

  onGameStarted(): Observable<{ message: string; player: string }> 
  {
    if (!this.socket) 
    {
      throw new Error('Socket.IO connection is not initialized.');
    }

    return new Observable((observer) => 
    {
      this.socket?.on('gameStarted', (data: { message: string; player: string }) => 
      {
        console.log('Received gameStarted event:', data);
        observer.next(data); // Pass the data to the observer
      });

      return () => 
      {
        this.socket?.off('gameStarted');
      };
    });
  }

  streamGame(
    lobbyId: string,
    whiteStrategyId: string,
    blackStrategyId: string
  ): Observable<
    | { type: 'move'; move: string; current_fen: string; turn: string; result: string }
    | { 
      type: 'game_end'; 
      current_fen: string; 
      move: string; 
      result: { 
        result_type: string; 
        winner: { strategy_id: string; color: string }; 
        loser: { strategy_id: string; color: string }; 
        game_pgn: string; 
        checksum: string; 
      }; 
      date: string; 
      turn: string; 
    }
  > 
  {
    if (!this.socket)
    {
      throw new Error('Socket.IO connection is not initialized.');
    }
  
    // Emit the e_game event only if the player is not the one that triggered forceGameStart
    if (this.isGameInitiator)
    {
      console.log("This player started the game")
      if (lobbyId && lobbyId !== "")
      {
        this.socket.emit('execute_game', 
        {
          lobbyId: lobbyId,
          white_strategy_id: whiteStrategyId,
          black_strategy_id: blackStrategyId,
        });
      }
    }
  
    return new Observable((observer) => {
      this.socket?.on(
        'move',
        (data: { type: 'move'; move: string; current_fen: string; turn: string; result: string }) => {
          observer.next(data); 
        }
      );
    
      this.socket?.on(
        'game_end',
        (data: { 
          type: 'game_end'; 
          current_fen: string; 
          move: string; 
          result: { 
            result_type: string; 
            winner: { strategy_id: string; color: string }; 
            loser: { strategy_id: string; color: string }; 
            game_pgn: string; 
            checksum: string; 
          }; 
          date: string; 
          turn: string; 
        }) => 
        {
          console.log('Game ended:', data);
          observer.next(data); 
          observer.complete(); 
        }
      );
    
      return () => {
        this.socket?.off('move');
        this.socket?.off('game_end');
      };
    });
    
  }


  getLobbyDetails (lobbyId: string): Observable<any> 
  {
    if (!this.socket) 
    {
      throw new Error('Socket.IO connection is not initialized.');
    }

    return new Observable((observer) => 
    {
      this.socket?.on(`lobbyDetails:${lobbyId}`, (data) => 
      {
        observer.next(data);
      });

      return () => 
      {
        this.socket?.off(`lobbyDetails:${lobbyId}`);
      };
    });
  }

onLobbyStateUpdate(): Observable<Lobby[]>
{
      if (!this.socket)
      {
          throw new Error('Socket.IO connection is not initialized.');
      }

      return new Observable((observer) =>
      {
          this.socket?.on('lobby_state', (data: any) =>
          {
              console.log('Received lobby_state event:', data);

              const availableLobbies: Lobby[] = [];

              // Process the data to extract lobbies
              Object.keys(data).forEach(lobbyId =>
              {
                  const players: Player[] = [];
                  let allPlayersReady = true;

                  // Loop through each player in the lobby
                  Object.keys(data[lobbyId]).forEach(playerId =>
                  {
                      const player = data[lobbyId][playerId];
                      players.push({ name: playerId, ready: player.ready, color: player.color, selected_strategy: player.selected_strategy });

                      if (!player.ready)
                      {
                          allPlayersReady = false;  // If any player is not ready, the game is not ready to start
                      }
                  });

                  const status = players.length === 2
                      ? (allPlayersReady ? 'In Progress' : 'Waiting for Player')
                      : 'Open'; // If there are no players or just 1 player, the lobby is 'Open'

                  availableLobbies.push(
                      {
                          id: lobbyId,
                          players: players,
                          status: status,
                      }
                  );
              });

              observer.next(availableLobbies);
          });

          return () =>
          {
              this.socket?.off('lobby_state');
          };
      });
  }

  requestLobbies(): Observable<Lobby[]>
  {
    // Emit 'request_lobbies' to request lobbies from the server
    this.socket?.emit('request_lobbies');
  
    // Return the observable of the lobby state
    return this.lobbyState$;
  }

}
