import { Component, OnInit, ChangeDetectorRef, HostListener , ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, User } from '@auth0/auth0-angular';
import { LobbyService } from 'src/services/lobby-service.service';
import { nanoid } from 'nanoid';
import { BehaviorSubject, filter, Observable, switchMap } from 'rxjs';
import { NgZone } from '@angular/core';
import { NgxChessBoardComponent } from 'ngx-chess-board';
import * as md5 from 'md5';
import { StrategyCardListProfileView } from 'src/models/start-card.model';
import { UserProfile } from 'src/models/user-profile.model';
import { HttpClient } from '@angular/common/http';

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

  private chessBoardSubject = new BehaviorSubject<NgxChessBoardComponent | null>(null);
  chessBoard$: Observable<NgxChessBoardComponent | null> = this.chessBoardSubject.asObservable();

  user$ = this.auth.user$;
  userProfileData$: Observable<UserProfile> | undefined;

  my_saved_strategies : StrategyCardListProfileView[] = []
  selected_strategy: StrategyCardListProfileView | null = null;

  playerReadyState = false;
  bothPlayersReadyState : { name: string, ready: boolean }[] = []

  constructor (
    private route : ActivatedRoute,
    private router: Router,
    private lobby : LobbyService,
    private auth  : AuthService,
    private cdr   : ChangeDetectorRef,
    private zone  : NgZone,
    private http  : HttpClient
  ) {}

  addPlayer (player: string): void 
  {
    const currentPlayers = this.playersSubject.value;
    this.playersSubject.next([...currentPlayers, player]);
  }
  initializeLobby(): void 
  {
    this.lobbyId = this.route.snapshot.paramMap.get('lobby-id');
  
    if (this.lobbyId && this.playerName) 
    {
      console.log(`Joining lobby with ID: ${this.lobbyId}`);
      this.joinLobby(this.lobbyId, this.playerName);
    } 
    else if (!this.lobbyId)
    {
      console.warn('No lobby ID provided in the URL');
    } else 
    {
      console.error('Player name is not set yet');
    }
  }
  ngOnInit (): void 
  {

    this.auth.user$.subscribe(user => 
      {
        if (user) 
        {
          this.playerName = user.sub ? md5(user.sub) : 'UNKNOWN_PLAYER';
          console.log(`Player name: ${this.playerName}`);
          this.initializeLobby();
        }
      });

      this.lobby.initializeSocket();

      // Wait for the socket to connect before proceeding
      this.lobbyId = this.route.snapshot.paramMap.get('lobby-id');
      if (this.lobbyId && this.playerName) 
      {
        this.joinLobby(this.lobbyId, this.playerName);
      }

      this.user$.pipe(
        filter((user): user is User => user != null),
        switchMap(user => 
          this.http.post<StrategyCardListProfileView[]>('/api/get_private_strategies', { 
            sub: user.sub
          })
        )
      ).subscribe(strategies => {
        this.my_saved_strategies = strategies;
        console.log("Retrieved user strategies: " + this.my_saved_strategies)
      });


      // Initialize a listener for readyness of players 
    this.lobby.onPlayerReadyUpdate().subscribe((data) => 
    {
      console.log('Updated player readiness:', data.players);
      this.bothPlayersReadyState = data.players; 
    });
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
    const newLobbyId = nanoid(6);
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

  selectStrategy(strategy: StrategyCardListProfileView): void 
  {
    this.selected_strategy = strategy;
    console.log(JSON.stringify(strategy))
  }

  toggleReadyState() : void
  {
    this.playerReadyState = !this.playerReadyState;
    if (this.lobbyId && this.playerName)
    {
      this.lobby.emitReadySignal(this.playerReadyState, this.lobbyId, this.playerName)
    }
  }

    updateBoardSize(): number {
      const viewportWidth = window.visualViewport ? window.visualViewport.width : window.innerWidth;
      this.boardSize = viewportWidth * 0.95 > 600 ? 600 : viewportWidth * 0.95;
      return this.boardSize;
    }
    @HostListener('window:resize', ['$event'])
    onResize(event: Event): void {
      this.updateBoardSize();
      this.cdr.detectChanges();
    }



}