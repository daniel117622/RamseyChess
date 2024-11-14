import { Component, ElementRef, ViewChild, AfterViewInit, HostListener, ChangeDetectorRef, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgxChessBoardComponent } from 'ngx-chess-board';
import { HttpClient } from '@angular/common/http';
import { PlayAiService } from '../../services/play-ai.service';
import { EvalService } from '../../services/eval-service.service';
import { NextMove } from 'src/models/next-move.model';
import { StrategyCardData, StrategyDetailResponse } from 'src/models/start-card.model';
import { Chess } from 'chess.js';

@Component({
  selector: 'app-play-bots-page',
  templateUrl: './play-bots-page.component.html',
  styleUrls: ['./play-bots-page.component.css']
})
export class PlayBotsPageComponent implements OnInit {
  @ViewChild('chessBoard') chessBoard!: NgxChessBoardComponent;
  currentFen : string = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
  boardSize = 600
  isPlaying: boolean = false;
  numMoves: number = 1;
  private _chess = new Chess();

  whiteStrategyId: string | null = null;
  blackStrategyId: string | null = null;

  selectedWhiteRowIndex: number | null = null;
  selectedBlackRowIndex: number | null = null;

  publicStrategies: StrategyCardData[] = []


  constructor(private router: Router, private http: HttpClient, private play_ai : PlayAiService, private eval_service : EvalService ,private cdr: ChangeDetectorRef) {}

  ngOnInit() : void 
  {
    this.play_ai.fetchStrategyCards().subscribe(
      (data: StrategyCardData[]) => {
        this.publicStrategies = data;
      }
    ); 
  }
  ngAfterViewInit(): void 
  {
    this.updateBoardSize(); 
    this.cdr.detectChanges(); 
  }
  onMoveChange() {
    const fen = this.chessBoard.getFEN();
    this.currentFen = fen
    this.eval_service.updateFen(this.currentFen);
  }

  async playTwoMoves()
  {
    this.isPlaying = true;
    for (let i = 0; i < 2; i++) 
    {
      const res: NextMove | {} = await this.play_ai.getNextMoveByStratId(this.currentFen, "671afaa69eb0593a9dea2024", 2);
      if ('best_move' in res && typeof res.best_move === 'string') 
      {
        this.chessBoard.move(res.best_move);
        this.currentFen = this.chessBoard.getFEN()
      } 
      else 
      {
        console.log("An error occurred while requesting a move for that strategy");
        break;
      }
    }
    this.isPlaying = false
  }

  async playNMoves(n: number, whiteStrategy: string, blackStrategy: string)
  {
    this.isPlaying = true;
  
    for (let i = 0; i < n; i++) 
    {
      const currentTurn = this.getCurrentTurn();
      const strategy = (currentTurn === 'w') ? whiteStrategy : blackStrategy;
  
      const res: NextMove | {} = await this.play_ai.getNextMoveByStratId(this.currentFen, strategy, 2);
      if ('best_move' in res && typeof res.best_move === 'string') 
      {
        this.chessBoard.move(res.best_move);
        this.currentFen = this.chessBoard.getFEN();

        this._chess.load(this.currentFen)
        console.log(this._chess.isCheckmate())
        if (this._chess.isCheckmate())
        {
          const winner = currentTurn === 'w' ? whiteStrategy : blackStrategy;
          console.log("Posting winner")
          this.isPlaying = false;
          this.play_ai.postWinner(whiteStrategy, blackStrategy, winner).subscribe(
            (response) => 
            {
              if (response.success) 
              {
                console.log('Winner data successfully posted:', { whiteStrategy, blackStrategy });
              } 
              else 
              {
                console.error('Failed to post winner data:', response.error);
              }
            },
            (error) => 
            {
              console.error('Error posting winner data:', error);
            }
          );
          return;
        } 

      } 
      else 
      {
        console.log('An error occurred while requesting a move for that strategy');
        break;
      }
    }
  
    this.isPlaying = false;
  }

  onRowClick(strategy: StrategyCardData, index: number): void 
  {
    if (this.whiteStrategyId === null) 
    {
      this.whiteStrategyId = strategy._id.$oid;
      this.selectedWhiteRowIndex = index;
    } 
    else if (this.blackStrategyId === null && this.selectedWhiteRowIndex !== index) 
    {
      this.blackStrategyId = strategy._id.$oid;
      this.selectedBlackRowIndex = index;
    } 
    else if (this.selectedWhiteRowIndex === index) 
    {
      // Deselect white strategy
      this.whiteStrategyId = null;
      this.selectedWhiteRowIndex = null;
    } 
    else if (this.selectedBlackRowIndex === index) 
    {
      // Deselect black strategy
      this.blackStrategyId = null;
      this.selectedBlackRowIndex = null;
    }
  }

  


  // Responsive board
  updateBoardSize(): number {
    const viewportWidth = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    this.boardSize = viewportWidth * 0.95 > 600 ? 600 : viewportWidth * 0.95;
    console.log(viewportWidth)
    return this.boardSize;
  }
  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.updateBoardSize();
    this.cdr.detectChanges();
  }

  getCurrentTurn(): 'w' | 'b' {
    const fen = this.chessBoard.getFEN();
    const fenParts = fen.split(' ');
    return fenParts[1] as 'w' | 'b';
  }
}
