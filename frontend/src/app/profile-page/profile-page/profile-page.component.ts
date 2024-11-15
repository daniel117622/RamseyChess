import { Component, OnInit } from '@angular/core';
import { AuthService, User } from '@auth0/auth0-angular';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { switchMap, filter } from 'rxjs/operators';

import { UserProfile } from 'src/models/user-profile.model';
import { StrategyCardListProfileView } from 'src/models/start-card.model';

@Component({
  selector: 'app-profile-page',
  templateUrl: './profile-page.component.html',
  styleUrls: ['./profile-page.component.css']
})
export class ProfilePageComponent implements OnInit {
  user$ = this.auth.user$;
  userProfileData$: Observable<UserProfile> | undefined;

  my_saved_strategies : StrategyCardListProfileView[] = []

  constructor(public auth: AuthService, private http: HttpClient) {}

  ngOnInit(): void {
    this.userProfileData$ = this.user$.pipe(
      filter((user): user is User => user != null),
      switchMap(user => 
        this.http.post<UserProfile>('/api/get_player_data', { 
          sub: user.sub, 
          nickname: user.nickname, 
          username: user.name
        })
      )
    );
    // ASYNC WITH PROFILE FETCHING
    this.user$.pipe(
      filter((user): user is User => user != null),
      switchMap(user => 
        this.http.post<StrategyCardListProfileView[]>('/api/get_private_strategies', { 
          sub: user.sub
        })
      )
    ).subscribe(strategies => {
      this.my_saved_strategies = strategies;
    });
  }
}