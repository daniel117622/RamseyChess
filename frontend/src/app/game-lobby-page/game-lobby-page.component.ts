import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { LobbyService } from 'src/services/lobby-service.service';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-game-lobby-page',
  templateUrl: './game-lobby-page.component.html',
  styleUrls: ['./game-lobby-page.component.css']
})
export class GameLobbyPageComponent implements OnInit 
{
  lobbyId   : string | null = null;
  playerName: string | null = null;
  players   : string[]      = []

  constructor (
    private route : ActivatedRoute,
    private router: Router,
    private lobby : LobbyService,
    private auth  : AuthService
  ) {}

  ngOnInit (): void 
  {

    this.auth.user$.subscribe(user => 
      {
        if (user) 
        {
          this.playerName = user.name ?? user.nickname ?? 'ADT PASSENGER';
          console.log(`Player name: ${this.playerName}`);
        }
      });

      this.lobby.initializeSocket();

      // Wait for the socket to connect before proceeding
      this.lobbyId = this.route.snapshot.paramMap.get('lobby-id');
      if (this.lobbyId && this.playerName) 
      {
        this.joinLobby(this.lobbyId, this.playerName);
      }
  }

  joinLobby(lobbyId: string, playerName: string): void 
  {
    this.lobby.joinLobby(lobbyId, playerName);
    
    this.lobby.onPlayerJoined().subscribe((player) => 
    {
      if (!this.players.includes(player.name)) 
      {
        this.players.push(player.name);
      }
    });
  }

  createLobby (): void 
  {
    const newLobbyId = uuidv4();
    console.log(`New lobby created with ID: ${newLobbyId}`);
  
    if (this.playerName) 
    {
      this.joinLobby(newLobbyId, this.playerName); 
      this.router.navigate(['/game-lobby', newLobbyId]);
    }
    else 
    {
      console.error('Cannot create lobby without player name');
    }
  }

  resetLobby (): void 
  {
    this.lobbyId = null;
    this.router.navigate(['/game-lobby']);
    this.players = [];
    console.log('Lobby reset');
  }

}