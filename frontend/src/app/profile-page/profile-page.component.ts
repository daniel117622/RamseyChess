import { Component, OnInit, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { AuthService, User } from '@auth0/auth0-angular';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { switchMap, filter, tap } from 'rxjs/operators';
import { UserProfile } from 'src/models/user-profile.model';
import { StrategyCardListProfileView, PaginatedStrategyResponse } from 'src/models/start-card.model';
import { Router } from '@angular/router';

import { GameService, PaginatedGames } from 'src/services/game-service.service';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { Clipboard } from '@angular/cdk/clipboard';


@Component({
  selector: 'app-profile-page',
  templateUrl: './profile-page.component.html',
  styleUrls: ['./profile-page.component.scss']
})
export class ProfilePageComponent implements OnInit {
  private updateInterval: any;
  user$ = this.auth.user$;
  userProfileData$: Observable<UserProfile> | undefined;
  totalPages : number = 0;
  currentPage: number = 1;
  my_saved_strategies : StrategyCardListProfileView[] = []
  current_nickname : string | null = ""

  paginatedGames : PaginatedGames | null = null;
  totalGamePages : number = 0;

  searchQueryStrategy = ""
  searchQueryGame     = ""

  currentGamePageNumber : number = 0

  private overlayRef: OverlayRef | null = null;

  @ViewChild('copiedMessage') copiedMessage!: TemplateRef<any>;

  last_games = [
    { date: new Date('2024-03-01'), player: '_Kuhaku_', opponent: 'Player123', result: 'Win', eloChange: +15 },
    { date: new Date('2024-02-27'), player: '_Kuhaku_', opponent: 'ChessMaster99', result: 'Loss', eloChange: -10 },
    { date: new Date('2024-02-22'), player: '_Kuhaku_', opponent: 'PawnStorm', result: 'Draw', eloChange: 0 }
  ];

  constructor(public auth: AuthService, private http: HttpClient, private router: Router, private gameService: GameService, private clipboard : Clipboard, private overlay : Overlay, private viewContainerRef: ViewContainerRef) {}

  ngOnInit(): void
  {
    // Register the user last activity.
    this.user$.pipe(
      filter((user): user is User => user != null),
      switchMap(user => 
        this.http.post<any>('/api/register_login', 
          { 
            sub: user.sub, 
          }
        )
      )
    ).subscribe();  // Ensure to subscribe to the observable here.
    // Fetch user profile data
    this.userProfileData$ = this.user$.pipe(
      filter((user): user is User => user != null),
      switchMap(user => 
        this.http.post<UserProfile>('/api/get_player_data', 
          { 
            sub: user.sub, 
            nickname: user.nickname, 
            username: user.name 
          }
        )
      ),
      tap(userProfile => {
        this.current_nickname = userProfile.nickname;
      })
    );
      
    // Fetch the first page of private strategies
    this.user$.pipe(
      filter((user): user is User => user != null),
      switchMap(user => 
        this.http.post<PaginatedStrategyResponse>('/api/get_private_strategies', 
          { 
            sub : user.sub,
            page: 1
          }
        )
      )
    ).subscribe(response => 
    {
      this.my_saved_strategies = response.strategies;
      this.totalPages          = response.total_pages;
      this.currentPage         = response.current_page;
    });

    this.fetchGames(3 , this.currentGamePageNumber)
  }


  goToPage(page: number): void
  {
    if (page >= 1 && page <= this.totalPages)
    {
      this.currentPage = page;
      this.fetchStrategies(page);
    }
  }

  fetchStrategies(page: number): void
  {
    // Update the strategy fetch call to use the current page
    this.user$.pipe(
      filter((user): user is User => user != null),
      switchMap(user => 
        this.http.post<PaginatedStrategyResponse>('/api/get_private_strategies', 
          { 
            sub: user.sub,
            page: page // Fetch strategies for the requested page
          }
        )
      )
    ).subscribe(response => 
    {
      this.my_saved_strategies = response.strategies;
      this.totalPages = response.total_pages;
      this.currentPage = response.current_page;
    });
  }

  editStrategy(strategy_id: string): void 
  {
    this.router.navigate(['/edit-strategy', strategy_id]);
  }

  viewDetails(strategy_id: string): void 
  {
    this.router.navigate(['/view-strategy', strategy_id]);
  }

  reviewGame(game_id: string): void 
  {
    this.router.navigate(['/game-db', game_id]);
  }

  shareGame(pgn: string): void
  {
      this.clipboard.copy(pgn);
      console.log('Game PGN copied to clipboard:', pgn);
      this.showCopiedMessage();
  }

  goToGamePage(page: number): void 
  {
      if (page >= 0 && page < this.totalGamePages) 
      {
          this.currentGamePageNumber = page;
          this.fetchGames(3, page); 
      }
  }
  

  searchGame(query: string): void
  {
    return
  }

  convertUTCToLocal (utcDate: string): string 
  {
    const date = new Date(utcDate);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
    const month = monthNames[date.getMonth()];
    const day   = String(date.getDate()).padStart(2, '0');
  
    let hours = date.getHours();
    const mins  = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
  
    hours = hours % 12;
    hours = hours === 0 ? 12 : hours; 
    const formattedHours = String(hours).padStart(2, '0');
  
    return `${month} ${day} ${formattedHours}:${mins} ${ampm}`;
  }

  fetchGames(itemsPerPage: number, pageNumber: number): void
  {
      this.user$.pipe(
          filter((user): user is User => user != null),
          switchMap(user => 
              this.gameService.getGames(user.sub, itemsPerPage, pageNumber)
          )
      ).subscribe({
          next: (data) =>
          {
              this.paginatedGames = data;
              this.totalGamePages = data.total_pages
              if (this.paginatedGames && Array.isArray(this.paginatedGames.games))
                {
                    // Re render every second.
                    this.updateInterval = setInterval(() => {
                        if (this.paginatedGames) {
                            this.paginatedGames = {
                                ...this.paginatedGames,  
                                games: [...this.paginatedGames.games] 
                            };
                        }
                    }, 1000);
                }

          },
          error: (error) =>
          {
              console.error('Error fetching games:', error);
          },
      });
  }

  getGameResult(whiteOwner: string, blackOwner: string, currentNickname: string | null, game_pgn: string): string
  {
      const resultMatch = game_pgn.match(/\[Result "([^"]+)"\]/);
      if (resultMatch)
      {
          const result = resultMatch[1];
          if (result === "1/2-1/2")
          {
              return "Draw";
          }
      }
  
      if (currentNickname === whiteOwner)
      {
          return "Win";
      }
      else if (currentNickname === blackOwner)
      {
          return "Loss";
      }
      return "Draw";
  }
  

timeSinceGame(gameDate: string): string
{
    // If the input doesn't already have the "T" delimiter, assume it's in the format "YYYY-MM-DD HH:mm:ss"
    let isoString = gameDate;
    if (!gameDate.includes('T'))
    {
        isoString = gameDate.replace(' ', 'T');
    }

    // Append 'Z' if it's not already present to indicate UTC time
    if (!isoString.endsWith('Z'))
    {
        isoString += 'Z';
    }

    // Parse the game date as UTC
    const gameTime = new Date(isoString);
    if (isNaN(gameTime.getTime()))
    {
        console.error('Invalid gameDate:', gameDate);
        return 'Invalid date';
    }

    const currentTime = new Date();
    const timeDifference = currentTime.getTime() - gameTime.getTime();  // Difference in milliseconds

    // If timeDifference is negative, the game date is in the future.
    if (timeDifference < 0)
    {
        console.error('The game date is in the future:', gameDate);
        return 'Invalid date (future time)';
    }

    const seconds = Math.floor(timeDifference / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours   = Math.floor(minutes / 60);
    const days    = Math.floor(hours / 24);

    let timeString = '';

    if (days > 0)
    {
        timeString += `${days} day${days === 1 ? '' : 's'} `;
        const remainingHours = hours % 24;
        if (remainingHours > 0)
        {
            timeString += `${remainingHours} hour${remainingHours === 1 ? '' : 's'}`;
        }
    }
    else if (hours > 0)
    {
        timeString += `${hours} hour${hours === 1 ? '' : 's'} `;
        const remainingMinutes = minutes % 60;
        if (remainingMinutes > 0)
        {
            timeString += `${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}`;
        }
    }
    else if (minutes > 0)
    {
        timeString += `${minutes} minute${minutes === 1 ? '' : 's'} `;
        const remainingSeconds = seconds % 60;
        if (remainingSeconds > 0)
        {
            timeString += `${remainingSeconds} second${remainingSeconds === 1 ? '' : 's'}`;
        }
    }
    else
    {
        timeString += `${seconds} second${seconds === 1 ? '' : 's'}`;
    }

    return timeString.trim();
}

  private showCopiedMessage(): void
  {
      if (this.overlayRef)
      {
          this.overlayRef.dispose();
      }

      this.overlayRef = this.overlay.create(
      {
          positionStrategy: this.overlay.position()
              .global()
              .bottom('20px')
              .right('20px'),
          hasBackdrop: false
      });

      const messagePortal = new TemplatePortal(this.copiedMessage, this.viewContainerRef);
      this.overlayRef.attach(messagePortal);

      setTimeout(() =>
      {
          if (this.overlayRef)
          {
              this.overlayRef.dispose();
              this.overlayRef = null;
          }
      }, 3000);
  }

}