import { Component, ElementRef, ViewChild, AfterViewInit, HostListener, ChangeDetectorRef, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgxChessBoardComponent } from 'ngx-chess-board';
import { HttpClient } from '@angular/common/http';
import { PlayAiService } from '../../services/play-ai.service';
import { EvalService } from '../../services/eval-service.service';
import { NextMove } from 'src/models/next-move.model';
import { StrategyCardData, StrategyDetailResponse } from 'src/models/start-card.model';
import { Chess, SQUARES, Square } from 'chess.js';
import { MatDialog } from '@angular/material/dialog'; // Import MatDialog
import { ResetPopupComponent } from './reset-popup/reset-popup.component';

interface PieceValues 
{
  [key: string]: number;
}



@Component({
  selector: 'app-play-bots-page',
  templateUrl: './play-bots-page.component.html',
  styleUrls: ['./play-bots-page.component.css']
})
export class PlayBotsPageComponent implements OnInit {
  @ViewChild('chessBoard') chessBoard!: NgxChessBoardComponent;
  currentFen : string = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
  isGameOver: boolean = false;
  boardSize = 600
  isPlaying: boolean = false;
  numMoves: number = 1;
  private _chess = new Chess();

  whiteStrategyId: string | null = null;
  blackStrategyId: string | null = null;

  selectedWhiteRowIndex: number | null = null;
  selectedBlackRowIndex: number | null = null;

  publicStrategies: StrategyCardData[] = []
  isWhiteBlinking: boolean = false;
  isBlackBlinking: boolean = false;

  whiteCapturedPieces: number  = 0;
  blackCapturedPieces: number  = 0;
  isWhiteWinner      : boolean = false;
  isBlackWinner      : boolean = false;

  constructor(
    private dialog: MatDialog,
    private play_ai: PlayAiService,
    private eval_service: EvalService,
    private cdr: ChangeDetectorRef
  ) {}

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
        const move = res.best_move;
        if (res.best_move.length === 5)
        {
          const from = move.substring(0, 2);
          const to = move.substring(2, 4);
          const promotionPiece = move[4].toLowerCase(); 

          // Load the current FEN into the chess.js instance
          this._chess.load(this.currentFen);

          // Make the move with promotion
          this._chess.move({ from, to, promotion: promotionPiece });

          // Get the updated FEN
          this.currentFen = this._chess.fen();

          // Update the ngx-chess-board with the new FEN
          this.chessBoard.setFEN(this.currentFen);
        }
        else
        { 
        this.chessBoard.move(res.best_move);
        this.currentFen = this.chessBoard.getFEN();
        this._chess.load(this.currentFen)
        }
        if (this._chess.isCheckmate())
        {
          const winner = currentTurn === 'w' ? whiteStrategy : blackStrategy;
          console.log("Posting winner")
          this.isPlaying = false;
          this.play_ai.postWinner(whiteStrategy, blackStrategy, winner).subscribe(
            (deltaElo: number | null) => 
            {
              if (deltaElo !== null) 
              {
                console.log('Winner data successfully posted:', { whiteStrategy, blackStrategy });
                // Updates the frontend view.
                this.updateElo(deltaElo, currentTurn);
                this.updateWinLoss(currentTurn === 'w' ? 'w' : 'b');
              } 
              else 
              {
                console.error('Failed to update Elo due to an error in posting winner data.');
              }
            },
            (error) => 
            {
              console.error('Error posting winner data:', error);
            }
          );          
          this.openResetPopup(currentTurn === 'w' ? 'White wins!' : 'Black wins!');
          return;
        } 
        if (this._chess.isDraw()) 
        {
          console.log("The game ended in a draw. No ELO scores will be changed.");
          this.play_ai.postWinner(whiteStrategy, blackStrategy, "").subscribe(
            (deltaElo: number | null) => 
            {
              if (deltaElo !== null) 
              {
                console.log('Winner data successfully posted:', { whiteStrategy, blackStrategy });
                this.updateElo(deltaElo, 'd');
              } 
              else 
              {
                console.error('Failed to post winner data.');
              }
            },
            (error) => 
            {
              console.error('Error posting winner data:', error);
            }
          );
          this.openResetPopup("Game ended in a draw");
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

  async playFullGame(whiteStrategyId: string, blackStrategyId: string): Promise<void> 
  {
      this.isPlaying = true;
  
      // Get the Observable from listenForMoves
      const moveObservable = this.play_ai.listenForMoves(whiteStrategyId, blackStrategyId, false);
  
      // Subscribe to the Observable to handle incoming data
      moveObservable.subscribe(
          (data) => 
          {
              if (data.type === 'move') 
              {
                  console.log('Received move:', data.move);
                  const beforeFen = this.currentFen;

                  // Check for promotion moves
                  if (data.move.length === 5) 
                  {
                      const from = data.move.substring(0, 2);
                      const to = data.move.substring(2, 4);
                      const promotionPiece = data.move[4].toLowerCase();
  
                      this._chess.load(this.currentFen);
                      this._chess.move({ from, to, promotion: promotionPiece });
                      this.currentFen = this._chess.fen();
                      this.chessBoard.setFEN(this.currentFen);
                  } 
                  else 
                  {
                      this.chessBoard.move(data.move);
                      this.currentFen = this.chessBoard.getFEN();
                      this._chess.load(this.currentFen);
                  }
                  const afterFen = this.currentFen;
                  // Increment counters
                  this.detectCapture(beforeFen, afterFen);
              } 
              else if (data.type === 'game_end') 
              {
                console.log('Game ended:', data.result);
                console.log('Received move:', data.move);
  
                // Move the piece before ending the game.
                if (data.move.length === 5) 
                {
                    const from = data.move.substring(0, 2);
                    const to = data.move.substring(2, 4);
                    const promotionPiece = data.move[4].toLowerCase();

                    this._chess.load(this.currentFen);
                    this._chess.move({ from, to, promotion: promotionPiece });
                    this.currentFen = this._chess.fen();
                    this.chessBoard.setFEN(this.currentFen);
                } 
                else 
                {
                    this.chessBoard.move(data.move);
                    this.currentFen = this.chessBoard.getFEN();
                    this._chess.load(this.currentFen);
                }
            
                // Check if the game ended with a winner or a draw
                if (data.result.result_type) 
                {
                    const resultType = data.result.result_type;  // '+' for white win, '-' for black win
                    const winnerColor = resultType === '+' ? 'white' : 'black';
                    const winnerStrategyId = data.result.winner.strategy_id;  // Strategy ID of the winner
                    const loserStrategyId = data.result.loser.strategy_id;   // Strategy ID of the loser
            
                    console.log(`Game ended with a winner: ${winnerColor}`);
            
                    // Post the winner and loser data
                    this.play_ai.postWinner(winnerColor === 'white' ? winnerStrategyId : loserStrategyId, 
                                            winnerColor === 'black' ? winnerStrategyId : loserStrategyId, 
                                            winnerColor).subscribe(
                        (deltaElo: number | null) => 
                        {
                            if (deltaElo !== null) 
                            {
                                console.log('Winner data successfully posted:', { winnerStrategyId, loserStrategyId });
                                this.updateElo(deltaElo, winnerColor === 'white' ? 'w' : 'b');
                            } 
                            else 
                            {
                                console.error('Failed to update Elo due to an error in posting winner data.');
                            }
                        },
                        (error) => 
                        {
                            console.error('Error posting winner data:', error);
                        }
                    );
            
                    this.openResetPopup(`${winnerColor.charAt(0).toUpperCase() + winnerColor.slice(1)} wins!`);
                } 
                else if (data.result.result_type === '*') 
                {
                    console.log('Game ended in a draw.');
                    this.play_ai.postWinner(whiteStrategyId, blackStrategyId, '').subscribe(
                        (deltaElo: number | null) => 
                        {
                            if (deltaElo !== null) 
                            {
                                console.log('Draw data successfully posted:', { whiteStrategyId, blackStrategyId });
                                this.updateElo(deltaElo, 'd');
                            } 
                            else 
                            {
                                console.error('Failed to post draw data.');
                            }
                        },
                        (error) => 
                        {
                            console.error('Error posting draw data:', error);
                        }
                    );
                    this.openResetPopup('Game ended in a draw');
                }
            
                this.isPlaying = false;
            }
          },
          (error) => 
          {
              console.error('Error during game:', error);
              this.isPlaying = false;
          },
          () => 
          {
              console.log('Game session completed');
              this.isPlaying = false;
          }
      );
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
         // Set isPlaying to false after the popup has closed and actions are complete
      }, 1500);
    });
  }
  
  updateElo(delta_elo: number, result: string) 
  {
      // ['b', 'w', 'd'] black win, white win, or draw
      const whiteStrategy = this.publicStrategies.find(
        (strategy) => strategy._id.$oid === this.whiteStrategyId
      );
      const blackStrategy = this.publicStrategies.find(
        (strategy) => strategy._id.$oid === this.blackStrategyId
      );
    
      if (!whiteStrategy || !blackStrategy) 
      {
        console.error('Strategies not found.');
        return;
      }
    
      if (result === 'w') 
      {
        whiteStrategy.elo += delta_elo;
        blackStrategy.elo -= delta_elo;
        console.log(`White wins. New Elo scores - White: ${whiteStrategy.elo}, Black: ${blackStrategy.elo}`);
      } 
      else if (result === 'b') 
      {
        whiteStrategy.elo -= delta_elo;
        blackStrategy.elo += delta_elo;
        console.log(`Black wins. New Elo scores - White: ${whiteStrategy.elo}, Black: ${blackStrategy.elo}`);
      } 
      else if (result === 'd') 
      {
        if (whiteStrategy.elo > blackStrategy.elo) 
        {
          whiteStrategy.elo -= delta_elo;
          blackStrategy.elo += delta_elo;
        } 
        else if (whiteStrategy.elo < blackStrategy.elo) 
        {
          whiteStrategy.elo += delta_elo;
          blackStrategy.elo -= delta_elo;
        }
        console.log(`Draw. New Elo scores - White: ${whiteStrategy.elo}, Black: ${blackStrategy.elo}`);
      }
  
      if (this.selectedWhiteRowIndex !== null) 
      {
        this.isWhiteBlinking = true;
      }
      if (this.selectedBlackRowIndex !== null)
      {
        this.isBlackBlinking = true;
      }
  
      // Detect changes to apply the class
      this.cdr.detectChanges();
      setTimeout(() => {
        this.isWhiteBlinking = false;
        this.isBlackBlinking = false;
        this.cdr.detectChanges();
      }, 1000);
    }

    updateWinLoss(result: string): void
    {
        // ['b', 'w', 'd'] black win, white win, or draw
        const whiteStrategy = this.publicStrategies.find(
            (strategy) => strategy._id.$oid === this.whiteStrategyId
        );
        const blackStrategy = this.publicStrategies.find(
            (strategy) => strategy._id.$oid === this.blackStrategyId
        );
    
        if (!whiteStrategy || !blackStrategy)
        {
            console.error('Strategies not found.');
            return;
        }
    
        if (result === 'w')
        {
            // White wins
            whiteStrategy.wins += 1;
            blackStrategy.losses += 1;
            console.log(`White wins. New records - White: ${whiteStrategy.wins} wins, Black: ${blackStrategy.losses} losses`);
        }
        else if (result === 'b')
        {
            // Black wins
            whiteStrategy.losses += 1;
            blackStrategy.wins += 1;
            console.log(`Black wins. New records - White: ${whiteStrategy.losses} losses, Black: ${blackStrategy.wins} wins`);
        }
        else if (result === 'd')
        {
            // Draw
            whiteStrategy.losses += 1;
            blackStrategy.losses += 1;
            console.log(`Draw. New records - White: ${whiteStrategy.losses} losses, Black: ${blackStrategy.losses} losses`);
        }
    
        // Trigger blinking for row highlighting based on changes
        if (this.selectedWhiteRowIndex !== null)
        {
            this.isWhiteBlinking = true;
        }
        if (this.selectedBlackRowIndex !== null)
        {
            this.isBlackBlinking = true;
        }
    
        // Detect changes to apply the class
        this.cdr.detectChanges();
        setTimeout(() =>
        {
            this.isWhiteBlinking = false;
            this.isBlackBlinking = false;
            this.cdr.detectChanges();
        }, 1000);
    }

    

    detectCapture(beforeFen: string, afterFen: string): void
    {
        const beforeBoard = new Chess(beforeFen);
        const afterBoard = new Chess(afterFen);
    
        for (let square of SQUARES)
        {
            const beforePiece = beforeBoard.get(square as Square);
            const afterPiece = afterBoard.get(square as Square);
    
            if (beforePiece && !afterPiece)
            {
                const capturedPieceType = beforePiece.type;
                const capturedPieceColor = beforePiece.color;
    
                if (capturedPieceColor === 'w')
                {
                    this.whiteCapturedPieces++;
                }
                else if (capturedPieceColor === 'b')
                {
                    this.blackCapturedPieces++;
                }
            }
        }
    }    
    
}
  

