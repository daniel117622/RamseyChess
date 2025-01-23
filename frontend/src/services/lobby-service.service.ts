import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LobbyService {
  constructor(private socket: Socket) {}

  joinLobby (lobbyId: string): void 
  {
    this.socket.emit('joinLobby', { lobbyId });
  }

  onPlayerJoined (): Observable<any> 
  {
    return this.socket.fromEvent('playerJoined');
  }

  getLobbyDetails (lobbyId: string): Observable<any> 
  {
    return this.socket.fromEvent(`lobbyDetails:${lobbyId}`);
  }
}