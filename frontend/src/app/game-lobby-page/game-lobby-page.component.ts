import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { LobbyService } from 'src/services/lobby-service.service';
import { v4 as uuidv4 } from 'uuid';
import { BehaviorSubject, Observable } from 'rxjs';
import { NgZone } from '@angular/core';

@Component({
  selector: 'app-game-lobby-page',
  templateUrl: './game-lobby-page.component.html',
  styleUrls: ['./game-lobby-page.component.css']
})
export class GameLobbyPageComponent implements OnInit 
{
  lobbyId: string | null = null;
  playerName: string | null = null;
  inputLobbyId: string = ''; 
  public playersSubject = new BehaviorSubject<string[]>([]);
  players$: Observable<string[]> = this.playersSubject.asObservable();


  constructor (
    private route : ActivatedRoute,
    private router: Router,
    private lobby : LobbyService,
    private auth  : AuthService,
    private cdr   : ChangeDetectorRef,
    private zone  : NgZone
  ) {}

  addPlayer (player: string): void 
  {
    const currentPlayers = this.playersSubject.value;
    this.playersSubject.next([...currentPlayers, player]);
  }

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
    this.lobby.emitJoinLobby(lobbyId, playerName);
  
    this.lobby.onPlayerJoined().subscribe((data) => 
    {
      console.log('Subscription triggered for players:', data.players);
  
      // Update the BehaviorSubject with the array of players
      this.playersSubject.next(data.players);
  
      // Populate the player list in the DOM
      const playerList = document.getElementById('playerList');
      if (playerList) 
      {
        // Clear the existing list to avoid duplicates
        playerList.innerHTML = '';
  
        // Loop through the updated players array and add them to the list
        data.players.forEach((playerName: string) => 
        {
          const listItem = document.createElement('li');
          listItem.textContent = playerName;
          playerList.appendChild(listItem); 
        });
      } 
      else 
      {
        console.error('#playerList not found in the DOM!');
      }
  
      console.log('Updated players array:', data.players);
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
    this.playersSubject.next([]);
    console.log('Lobby reset');
  }

  getPlayersArray(): string 
  {
    return JSON.stringify(this.playersSubject.value);
  }
  handleJoinLobby (): void 
  {
    if (!this.inputLobbyId.trim()) 
    {
      console.error('Lobby ID cannot be empty');
      return;
    }

    this.router.navigate(['/game-lobby', this.inputLobbyId]).then(() => 
    {
      if (this.playerName) 
      {
        this.joinLobby(this.inputLobbyId, this.playerName);
      }
    });
  }

}