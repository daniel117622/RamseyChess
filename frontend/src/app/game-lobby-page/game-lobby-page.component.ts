import { Component, OnInit, ChangeDetectorRef, HostListener , ViewChild } from '@angular/core';
import { ActivatedRoute, Router , NavigationEnd} from '@angular/router';
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
  isPlayerInLobby : boolean = false;

  gameFinishedPgn : string | null = null;

  @ViewChild('chessBoard', { static: true }) chessBoard!: NgxChessBoardComponent;

  private chessBoardSubject = new BehaviorSubject<NgxChessBoardComponent>(this.chessBoard);
  chessBoard$: Observable<NgxChessBoardComponent> = this.chessBoardSubject.asObservable();

  user$ = this.auth.user$;
  user_id : string | undefined = undefined;
  userProfileData$: Observable<UserProfile> | undefined;

  my_saved_strategies : StrategyCardListProfileView[] = []
  selected_strategy: StrategyCardListProfileView | null = null;

  has_posted_game = false;

  playerReadyState = false;
  bothPlayersReadyState : { name: string, ready: boolean }[] = []
  all_buttons_frozen: boolean = false;
  availableLobbies = [
    { id: 'room-1', players: [{ name: 'Alice' }], status: 'Waiting for Player' },
    { id: 'room-2', players: [{ name: 'Bob' }, { name: 'Eve' }], status: 'In Progress' },
    { id: 'room-3', players: [], status: 'Open' },
    { id: 'room-4', players: [{ name: 'Charlie' }], status: 'Waiting for Player' },
    { id: 'room-5', players: [{ name: 'David' }, { name: 'Faythe' }], status: 'In Progress' },
    { id: 'room-6', players: [{ name: 'Grace' }], status: 'Waiting for Player' },
    { id: 'room-7', players: [{ name: 'Heidi' }], status: 'Waiting for Player' },
    { id: 'room-8', players: [{ name: 'Ivan' }, { name: 'Judy' }], status: 'In Progress' },
    { id: 'room-9', players: [], status: 'Open' },
    { id: 'room-10', players: [{ name: 'Mallory' }], status: 'Waiting for Player' }
  ];
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
    // An event which resets state properly.
    this.router.events
    .pipe(filter(event => event instanceof NavigationEnd))
    .subscribe((event: NavigationEnd) => 
    {
      if (event.url === '/game-lobby') 
      {
        this.resetState()
      }
    });

    this.auth.user$.subscribe(user => 
      {
        if (user) 
        {
          this.playerName = user.sub ? md5(user.sub) : 'UNKNOWN_PLAYER';
          console.log(`Player name: ${this.playerName}`);
          this.user_id = user.sub
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
          this.http.post<StrategyCardListProfileView[]>('/api/get_private_strategies_all', { 
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

    this.lobby.onGameStarted().subscribe( (data : any) => {
      console.log("Game started payload:", JSON.stringify(data));

      const lobbyId = this.lobbyId; 
      const whiteStrategyId = data.white_strategy;
      const blackStrategyId = data.black_strategy;

      this.lobby.streamGame(lobbyId || '', whiteStrategyId, blackStrategyId).subscribe((data) => 
      {
          if (data.type === 'move' && data.move) 
          {
              console.log(`Executing move: ${data.move}`);
              this.chessBoard.move(data.move); 
          } 
          else if (data.type === 'game_end' && data.move) 
          {
              console.log(`Final move before game ends: ${data.move}`);
              this.chessBoard.move(data.move);
      
              // Ensure result exists before accessing properties
              if (data.result?.winner) 
              {
                  console.log(`Game Winner: Strategy ID - ${data.result.winner.strategy_id}, Color - ${data.result.winner.color}`);
              }
              
              // Ensure game_pgn exists before parsing
              if (data.result.game_pgn) 
              {
                  const totalTurns = data.result.game_pgn.split(/\d+\./).length - 1; // Count turns from PGN
                  console.log(`Total number of turns: ${totalTurns}`);
                  this.gameFinishedPgn = data.result.game_pgn
              }
          }
      });
    })
    this.updateBoardSize();
  }


  joinLobby(lobbyId: string, playerName: string): void 
  {
      this.isPlayerInLobby = true;
      this.lobby.emitJoinLobby(lobbyId, playerName);
  
      this.lobby.onPlayerJoined().subscribe((data: { players: { name: string; color: string }[] }) =>
      {
          const playerList = document.getElementById('playerList');
          playerList!.innerHTML = '';
  
          const playerNames = data.players.map(player => player.name);
  
          playerNames.forEach((playerName: string) =>
          {
              const listItem = document.createElement('li');
              listItem.textContent = playerName;
              listItem.classList.add('player-entry');  // Add the player-entry class
              playerList!.appendChild(listItem);
          });
  
          const currentPlayer = data.players.find(player => player.name === playerName);
          if (currentPlayer && currentPlayer.color === 'black')
          {
              this.chessBoard.reverse();
              console.log('Chessboard reversed for black player');
          }
      });
  }
  

  createLobby (): void 
  {
    const newLobbyId = nanoid(6);
    this.isPlayerInLobby = true
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
    this.isPlayerInLobby = false;
    this.gameFinishedPgn = null;
    this.has_posted_game = false;
    console.log('Lobby reset');
  }

  resetState(): void
  {
    this.lobbyId = null;
    this.playersSubject.next([]);
    this.isPlayerInLobby = false;
    this.gameFinishedPgn = null;
    this.has_posted_game = false;
  }

  handleJoinLobby(): void
  {
      if (!this.inputLobbyId.trim())
      {
          console.error('Lobby ID cannot be empty');
          return;
      }
  
      window.location.href = `/game-lobby/${this.inputLobbyId}`;
      
      if (this.playerName)
      {
          this.isPlayerInLobby = true;
          this.joinLobby(this.inputLobbyId, this.playerName);
      }
  }

  selectStrategy(strategy: StrategyCardListProfileView): void 
  {
    this.selected_strategy = strategy;
  }

  toggleReadyState() : void
  {
    this.playerReadyState = !this.playerReadyState;
    if (this.lobbyId && this.playerName)
    {
      this.lobby.emitReadySignal(this.playerReadyState, this.lobbyId, this.playerName, this.selected_strategy?._id.$oid ||  '')
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

    areBothPlayersReady(): boolean 
    {
      return (
        this.bothPlayersReadyState.length === 2 &&
        this.bothPlayersReadyState.every(player => player.ready)
      );
    }
    
    startGame(): void 
    {
      console.log('Game started!');
      this.all_buttons_frozen = true;
      if (this.playerName && this.lobbyId)
      {
        this.lobby.emitForceGameStart(this.lobbyId, this.playerName)
      }
    }

    joinExistingLobby(lobby_id : any) : void
    {
      return
    }
}