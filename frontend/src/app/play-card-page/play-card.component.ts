import { Component, OnInit, ViewChild, HostListener, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { StrategyCardData, StrategyDetailResponse } from 'src/models/start-card.model';
import { PlayAiService } from '../../services/play-ai.service';
import { ActivatedRoute } from '@angular/router';
import { NgxChessBoardComponent } from 'ngx-chess-board';
import { NextMove } from 'src/models/next-move.model';
import { Chess } from 'chess.js';

import { MatDialog } from '@angular/material/dialog'; 
import { ResetPopupComponent } from '../play-bots-page/reset-popup/reset-popup.component';

enum Color 
{
  White = 'w',
  Black = 'b'
}

@Component({
  selector: 'app-play-card',
  templateUrl: './play-card.component.html',
  styleUrls: ['./play-card.component.scss'],
})

export class PlayAiCardComponent implements OnInit {
  @ViewChild('chessBoard') chessBoard!: NgxChessBoardComponent;
  strategy_card : StrategyDetailResponse | null = null;
  cardId: string | null = null;
  card_name : string = '';
  boardSize: number = 600;
  gameFinished = false;
  currentFen : string = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

  isPlaying  = true
  isGameOver = false

  constructor(private play_ai: PlayAiService, private route: ActivatedRoute, private cdr : ChangeDetectorRef, private dialog : MatDialog) {}

  ngOnInit(): void 
  {
    this.route.params.subscribe(params => {
      this.cardId = params['id']; 
    }); 
    if (this.cardId)
    {
      this.play_ai.fetchStrategyCardDetailsById(this.cardId).subscribe((response : StrategyDetailResponse) => {
        console.log("RESPONSE: " + response);
        this.strategy_card = response;
        this.card_name = response[0].name
      })
    }
  }
  ngAfterViewInit(): void 
  {
    this.updateBoardSize(); 
    this.cdr.detectChanges(); 
  }
  requestMoveByAi() 
  {
    if (this.currentFen && this.cardId) 
    {
      this.play_ai.getNextMoveByStratId(this.currentFen, this.cardId, 2)
        .then(nextMove => {
          console.log('Next move received:', nextMove);
        })
        .catch(error => {
          console.error('Error fetching next move:', error);
        });
    } 
  }

  onMoveChange()
  {
      const fen = this.chessBoard.getFEN();
      this.currentFen = fen;
      console.log('Current FEN:', fen);
      const activeColor: 'b' | 'w' = fen.split(' ')[1] as 'b' | 'w';
      const winner = activeColor === 'b' ? 'White' : 'Black';
      
      const chess = new Chess(fen);
  
      // Check for draw or checkmate conditions first
      if (chess.isCheckmate())
      {
          const winner = fen.split(' ')[1] === 'b' ? 'White' : 'Black';
          this.openResetPopup(`${winner} wins by checkmate!`);
          return;
      }
  
      if (chess.isDraw())
      {
          this.openResetPopup("Game ended in a draw");
          return;
      }
  
      // If it's the AI's turn (Black is playing)
      if (activeColor === 'b')
      {
          this.play_ai.getNextMoveByStratId(fen, this.cardId, 2).then((res: NextMove | {}) =>
          {
              console.log(res);
  
              if ('best_move' in res && res.best_move !== "")
              {
                  this.chessBoard.move(res.best_move);
              }
              else
              {
                  this.openResetPopup(`${winner} wins!`);
              }
          })
          .catch(() => {});
      }
  }

  getRandomLegalMove(fen: string): string {
    const chess = new Chess(fen);
    const legalMoves = chess.moves({ verbose: true }); // Get detailed move objects
  
    if (legalMoves.length === 0) {
      return ""; // No legal moves available
    }
  
    const randomIndex = Math.floor(Math.random() * legalMoves.length);
    const randomMove = legalMoves[randomIndex];
  
    return randomMove.from + randomMove.to; // Return the move in source + target format (e.g., e2e4)
  }


  objectEntries(obj: any): { key: string, value: any }[] 
  {
    return Object.entries(obj).map(([key, value]) => ({ key, value }));
  }
  getPieceValue(pieces: any, key: string): number 
  {
    return (pieces as Record<string, number>)[key] ?? 0;
  }
  updateBoardSize(): number 
  {
    const viewportWidth = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    this.boardSize = viewportWidth * 0.8 > 600 ? 600 : viewportWidth * 0.8;
    console.log(viewportWidth)
    return this.boardSize;
  }
  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.updateBoardSize();
    this.cdr.detectChanges();
  }

  openResetPopup(gameResult: string): void {
    const dialogRef = this.dialog.open(ResetPopupComponent, {
      width: '400px',
      hasBackdrop: true,
      disableClose: true,
      data: gameResult // Pass the game result here
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log("User confirmed action in reset popup.");
        this.chessBoard.reset();
        this.currentFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      } else {
        console.log("User canceled action in reset popup.");
      }
      this.isPlaying = true;
      setTimeout(() => {
        this.isGameOver = true;
      }, 1500);
    });
  }
  

}
