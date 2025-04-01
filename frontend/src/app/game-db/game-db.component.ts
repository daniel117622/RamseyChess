import { Component, OnInit, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { GameService, Game } from 'src/services/game-service.service';
import { switchMap, filter } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Clipboard } from '@angular/cdk/clipboard';
import { Router } from '@angular/router';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';

@Component(
{
    selector   : 'app-game-db',
    templateUrl: './game-db.component.html',
    styleUrls  : ['./game-db.component.scss']
})
export class GameDbComponent implements OnInit
{
    gameId: string | null = null;
    game  : Game | null = null;
    private overlayRef: OverlayRef | null = null;

    @ViewChild('copiedMessage') copiedMessage!: TemplateRef<any>;

    constructor(
        private route        : ActivatedRoute,
        private gameService  : GameService,
        public  auth         : AuthService,
        private clipboard    : Clipboard,
        private router       : Router,
        private overlay      : Overlay,
        private viewContainerRef: ViewContainerRef
    )
    {
    }

    ngOnInit(): void
    {
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
  
    shareGame(pgn: string): void
    {
        this.clipboard.copy(pgn);
        console.log('Game PGN copied to clipboard:', pgn);
        this.showCopiedMessage();
    }

    goBack(): void
    {
        this.router.navigate(['/profile'], { relativeTo: this.router.routerState.root });
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
