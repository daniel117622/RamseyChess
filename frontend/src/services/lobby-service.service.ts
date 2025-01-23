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
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const host = window.location.host;
    const socketPort = '3000';
    const socketUrl = `${protocol}//${host.split(':')[0]}:${socketPort}`;
    this.socket = io(socketUrl, 
    {
      path: '/socket.io',
      transports: ['websocket']
    });
  }

  joinLobby (lobbyId: string): void 
  {
    if (this.socket) 
    {
      this.socket.emit('joinLobby', { lobbyId });
    }
  }

  onPlayerJoined (): Observable<any> 
  {
    if (!this.socket) 
    {
      throw new Error('Socket.IO connection is not initialized.');
    }

    return new Observable((observer) => 
    {
      this.socket?.on('playerJoined', (data) => 
      {
        observer.next(data);
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
