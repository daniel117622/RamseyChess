import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LobbyService 
{
  private socket: Socket | null = null;

  initializeSocket (): void 
  {
    if (this.socket) {
      console.warn('Socket.IO connection is already initialized.');
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

  emitReadySignal (readyState: boolean, lobbyId: string, playerName: string): void 
  {
    if (!this.socket) 
    {
      console.error('Socket.IO connection is not initialized.');
      return;
    }
    this.socket.emit('playerReady', { ready: readyState , name : playerName , lobbyId: lobbyId});
  }

  onPlayerJoined(): Observable<{ players: string[] }> 
  {
    if (!this.socket) 
    {
      throw new Error('Socket.IO connection is not initialized.');
    }
  
    return new Observable((observer) => 
    {
      this.socket?.on('playerJoined', (data: { players: string[] }) => 
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
}
