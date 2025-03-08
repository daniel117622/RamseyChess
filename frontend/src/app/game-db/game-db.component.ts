import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { GameService , Game } from 'src/services/game-service.service';
import { switchMap, filter } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Component(
{
  selector: 'app-game-db',
  templateUrl: './game-db.component.html',
  styleUrls: ['./game-db.component.css']
})
export class GameDbComponent implements OnInit
{
  gameId: string | null = null;
  game  :   Game | null = null;

  constructor(
    private route      : ActivatedRoute,
    private gameService: GameService,
    public  auth       : AuthService
  )
  {}

  ngOnInit(): void
  {
    // Retrieve the 'game-id' parameter from the route
    this.gameId = this.route.snapshot.paramMap.get('game-id');
    
    // Fetch game details using the user.sub and gameId
    if (this.gameId)
    {
      this.auth.user$.pipe(
        filter((user): user is { sub: string } => user != null),  
        switchMap(user => this.loadGameDetails(this.gameId || '', user.sub))  // Use user.sub to get the game details
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
}
