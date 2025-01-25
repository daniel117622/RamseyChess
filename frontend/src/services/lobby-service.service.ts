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
      });
  
      return () => 
      {
        this.socket?.off('playerJoined');
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
