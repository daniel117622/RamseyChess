import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LobbyService } from 'src/services/lobby-service.service';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-game-lobby-page',
  templateUrl: './game-lobby-page.component.html',
  styleUrls: ['./game-lobby-page.component.css']
})
export class GameLobbyPageComponent implements OnInit 
{
  lobbyId: string | null = null;
  players: string[] = []

  constructor (
    private route: ActivatedRoute,
    private router: Router,
    private lobby: LobbyService
  ) {}

  ngOnInit (): void 
  {
    this.lobbyId = this.route.snapshot.paramMap.get('lobby-id');
    if (this.lobbyId) 
    {
      this.connectToLobby(this.lobbyId);
    }
  }

  connectToLobby (lobbyId: string): void 
  {
    this.lobbyId = lobbyId;
    this.router.navigate(['/game-lobby', lobbyId]); 
    this.lobby.joinLobby(lobbyId);

    this.lobby.onPlayerJoined().subscribe(player => 
    {
      if (!this.players.includes(player)) 
      {
        this.players.push(player);
      }
    });
  }

  createLobby (): void 
  {
    const newLobbyId = uuidv4();
    console.log(`New lobby created with ID: ${newLobbyId}`);
    this.connectToLobby(newLobbyId); 
  }

  resetLobby (): void 
  {
    this.lobbyId = null;
    this.players = [];
    console.log('Lobby reset');
  }

}
