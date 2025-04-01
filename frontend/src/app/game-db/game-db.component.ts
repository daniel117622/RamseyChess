import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { GameService , Game } from 'src/services/game-service.service';
import { switchMap, filter } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Clipboard } from '@angular/cdk/clipboard';
import { Router } from '@angular/router';


@Component(
{
  selector: 'app-game-db',
  templateUrl: './game-db.component.html',
  styleUrls: ['./game-db.component.scss']
})
export class GameDbComponent implements OnInit
{
  gameId: string | null = null;
  game  :   Game | null = null;

  constructor(
    private route      : ActivatedRoute,
    private gameService: GameService,
    public  auth       : AuthService,
    private clipboard  : Clipboard,
    private router     : Router
  )
  {}

  ngOnInit(): void
  {
    // Retrieve the 'game-id' parameter from the route
    this.gameId = this.route.snapshot.paramMap.get('id');
    

    if (this.gameId)
    {
      this.auth.user$.pipe(
        filter((user): user is { sub: string } => user != null),  
        switchMap(user => this.loadGameDetails(this.gameId || '', user.sub))  
      ).subscribe(
        (data: Game) => 
        {
          this.game = data;
          console.log('Game details:', this.game);
        },
        (error) => 
        {
          console.error('Error fetching game details:', error);
        }
      );
    }
  }

  loadGameDetails(gameId: string, sub: string): Observable<Game>
  {
    return this.gameService.getGameById(gameId, sub);
  }
  
  shareGame(pgn : string): void 
  {
    this.clipboard.copy(pgn);
    console.log('Game URL copied to clipboard:', pgn);
  }

  goBack(): void 
  {
    this.router.navigate(['../'], { relativeTo: this.router.routerState.root });
  }
}
