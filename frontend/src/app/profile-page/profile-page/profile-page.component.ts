import { Component, OnInit } from '@angular/core';
import { AuthService, User } from '@auth0/auth0-angular';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { switchMap, filter } from 'rxjs/operators';
import { UserProfile } from 'src/models/user-profile.model';
import { StrategyCardListProfileView, PaginatedStrategyResponse } from 'src/models/start-card.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile-page',
  templateUrl: './profile-page.component.html',
  styleUrls: ['./profile-page.component.css']
})
export class ProfilePageComponent implements OnInit {
  user$ = this.auth.user$;
  userProfileData$: Observable<UserProfile> | undefined;
  totalPages : number = 0;
  currentPage: number = 1;
  my_saved_strategies : StrategyCardListProfileView[] = []

  last_games = [
    { date: new Date('2024-03-01'), player: 'Daniel', opponent: 'Player123', result: 'Win', eloChange: +15 },
    { date: new Date('2024-02-27'), player: 'Daniel', opponent: 'ChessMaster99', result: 'Loss', eloChange: -10 },
    { date: new Date('2024-02-25'), player: 'Daniel', opponent: 'RookWarrior', result: 'Win', eloChange: +20 },
    { date: new Date('2024-02-22'), player: 'Daniel', opponent: 'PawnStorm', result: 'Draw', eloChange: 0 }
  ];

  constructor(public auth: AuthService, private http: HttpClient, private router: Router) {}

  ngOnInit(): void
  {
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
      )
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

  editStrategy(strategy_id : string)
  {
    return
  }
  viewDetails(strategy_id : string)
  {
    return
  }

  reviewGame(strategy_id : string)
  {
    return
  }
  shareGame(strategy_id : string)
  {
    return
  }

  goToGamePage(page: number): void
  {
    return
  }

}