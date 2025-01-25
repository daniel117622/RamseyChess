import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { LobbyService } from 'src/services/lobby-service.service';
import { v4 as uuidv4 } from 'uuid';
import { BehaviorSubject, Observable } from 'rxjs';
import { NgZone } from '@angular/core';
import * as md5 from 'md5';

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

  readyStates: { [player: string]: boolean } = {};
  isRoomFull: boolean = false;
  boardSize = 600
  
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
          this.playerName = user.sub ? md5(user.sub) : 'UNKNOWN_PLAYER';
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
  
      const playerList = document.getElementById('playerList');
      if (playerList) 
      {
        playerList.innerHTML = '';
  
        if (Array.isArray(data.players)) 
        {
          data.players.forEach((playerName: string) => 
          {
            const listItem = document.createElement('li');
            listItem.textContent = playerName;
            playerList.appendChild(listItem);
            console.log(`Added player '${playerName}' to the DOM:`, listItem);
          });
        } 
        else 
        {
          console.error('Players array is missing or invalid in data:', data);
        }
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


    updateBoardSize(): number {
      const viewportWidth = window.visualViewport ? window.visualViewport.width : window.innerWidth;
      this.boardSize = viewportWidth * 0.95 > 600 ? 600 : viewportWidth * 0.95;
      console.log(viewportWidth)
      return this.boardSize;
    }
    @HostListener('window:resize', ['$event'])
    onResize(event: Event): void {
      this.updateBoardSize();
      this.cdr.detectChanges();
    }
}