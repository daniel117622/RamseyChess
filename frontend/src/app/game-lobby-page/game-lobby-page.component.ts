import { Component, OnInit, ChangeDetectorRef, HostListener , ViewChild } from '@angular/core';
import { ActivatedRoute, Router , NavigationEnd} from '@angular/router';
import { AuthService, User } from '@auth0/auth0-angular';
import { LobbyService , Lobby } from 'src/services/lobby-service.service';
import { nanoid } from 'nanoid';
import { BehaviorSubject, filter, Observable, of, switchMap } from 'rxjs';
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
  players: { name: string; color: string }[] = [];


  gameFinishedPgn : string | null = null;

  @ViewChild('chessBoard', { static: true }) chessBoard!: NgxChessBoardComponent;

  private chessBoardSubject = new BehaviorSubject<NgxChessBoardComponent>(this.chessBoard);
  chessBoard$: Observable<NgxChessBoardComponent> = this.chessBoardSubject.asObservable();

  user$ = this.auth.user$;
  user_id : string | undefined = undefined;
  userProfileData$: Observable<UserProfile> | undefined;

  my_saved_strategies$: Observable<StrategyCardListProfileView[]> = of([]);
  selected_strategy: StrategyCardListProfileView | null = null;

  has_posted_game = false;

  playerReadyState = false;
  bothPlayersReadyState : { name: string, ready: boolean }[] = []
  all_buttons_frozen: boolean = false;

  availableLobbies$!: Observable<Lobby[]>;
  
  constructor (
    private route : ActivatedRoute,
    private router: Router,
    private lobby : LobbyService,
    private auth  : AuthService,
    private cdr   : ChangeDetectorRef,
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
    .pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    )
    .subscribe((event: NavigationEnd) => {
      if (event.url === '/game-lobby') {
        this.resetState();
      }
    });

    this.auth.user$.subscribe(user => {
      if (user) {
        this.playerName = (user.nickname || 'UNKNOWN_PLAYER').toUpperCase();
        console.log(`Player name: ${this.playerName}`);
        this.user_id = user.sub;
        this.initializeLobby();
      }
    });

    // Initialize socket first to ensure connection is established before using it
    this.lobby.initializeSocket();

    // Subscribe to lobby updates after socket is initialized
    this.availableLobbies$ = this.lobby.onLobbyStateUpdate();

      // Wait for the socket to connect before proceeding
      this.lobbyId = this.route.snapshot.paramMap.get('lobby-id');
      if (this.lobbyId && this.playerName) 
      {
        this.joinLobby(this.lobbyId, this.playerName);
      }

      this.my_saved_strategies$ = this.user$.pipe(
        filter((user): user is User => user != null),
        switchMap(user => 
          this.http.post<StrategyCardListProfileView[]>('/api/get_private_strategies_all', { 
            sub: user.sub
          })
        )
      );


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
          // Update the players array with the new lobby data
          this.players = data.players;

          const currentPlayer = data.players.find((player) => player.name === playerName);
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
    if (this.all_buttons_frozen) { return }
    this.lobbyId = null;
    this.router.navigate(['/game-lobby']);
    this.playersSubject.next([]);
    this.isPlayerInLobby = false;
    this.gameFinishedPgn = null;
    this.has_posted_game = false;
    this.players = []
    console.log('Lobby reset');
    this.availableLobbies$! = this.lobby.requestLobbies()
  }

  resetState(): void
  {
    this.lobbyId = null;
    this.playersSubject.next([]);
    this.isPlayerInLobby = false;
    this.gameFinishedPgn = null;
    this.has_posted_game = false;
    this.players = []
    this.availableLobbies$ = this.lobby.requestLobbies()
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

  handleJoinLobbyFromButton(lobby_id : string) : void
  {
    window.location.href = `/game-lobby/${lobby_id}`;
    
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
    if (this.all_buttons_frozen) { return }
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
      if (this.all_buttons_frozen) { return }
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