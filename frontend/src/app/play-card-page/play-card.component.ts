import { Component, OnInit, ViewChild, HostListener, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { StrategyCardData, StrategyDetailResponse } from 'src/models/start-card.model';
import { PlayAiService } from '../../services/play-ai.service';
import { ActivatedRoute } from '@angular/router';
import { NgxChessBoardComponent } from 'ngx-chess-board';
import { NextMove } from 'src/models/next-move.model';
import { Chess } from 'chess.js';

@Component({
  selector: 'app-play-card',
  templateUrl: './play-card.component.html',
  styleUrls: ['./play-card.component.css'],
})

export class PlayAiCardComponent implements OnInit {
  @ViewChild('chessBoard') chessBoard!: NgxChessBoardComponent;
  strategy_card : StrategyDetailResponse | null = null;
  cardId: string | null = null;
  boardSize: number = 600;
  gameFinished = false;
  currentFen : string = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
  constructor(private play_ai: PlayAiService, private route: ActivatedRoute, private cdr : ChangeDetectorRef) {}

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
    this.currentFen = fen
    console.log('Current FEN:', fen);
    const activeColor = fen.split(' ')[1]; 
    if (activeColor == 'b')
    {
      this.play_ai.getNextMoveByStratId(fen, this.cardId, 2).then( (res : NextMove | {}) =>
      {  
        console.log(res)
        if ('best_move' in res && res.best_move != "")
        {
          this.chessBoard.move(res.best_move)
        }
        else
        {
          console.log("Trying a random move")
          const randomMove = this.getRandomLegalMove(fen);
          console.log(randomMove)
          this.chessBoard.move(randomMove);
        }
        
      })
      .catch(() => {
      });
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
  getPieceValue(pieces: any, key: string): number | undefined 
  {
    return (pieces as Record<string, number>)[key];
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

}
