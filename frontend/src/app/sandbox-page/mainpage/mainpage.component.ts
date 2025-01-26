import { Component, ElementRef, ViewChild, AfterViewInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { NgxChessBoardComponent } from 'ngx-chess-board';
import { MatevalComponent } from '../mateval/mateval.component';
import { MinimaxComponent } from '../minimax/minimax.component';
import { HttpClient } from '@angular/common/http';
import { EvalService } from 'src/services/eval-service.service';

@Component({
  selector: 'app-mainpage',
  templateUrl: './mainpage.component.html',
  styleUrls: ['./mainpage.component.css'],
})
export class MainpageComponent implements AfterViewInit {
  @ViewChild('chessBoard') chessBoard!: NgxChessBoardComponent;
  boardSize: number = 200;
  gameFinished = false;
  currentFen : string = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
  constructor(private router: Router, private http: HttpClient, private eval_service: EvalService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    // Subscribe to bestMoveReadable$ to trigger move on chessboard
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.updateBoardSize();
    this.cdr.detectChanges();
  }
  
  ngAfterViewInit() {
    setTimeout(() => {
      this.chessBoard.reset();
      this.currentFen = this.chessBoard.getFEN();
      this.eval_service.updateFen(this.currentFen);
      this.updateBoardSize();
  
      // Subscribe to bestMove$ to trigger move on chessboard
      this.eval_service.bestMove$.subscribe((bestMove: string | null) => {
        if (bestMove) {
          console.log('Moving piece to:', bestMove);
          this.chessBoard.move(bestMove);
        }
      });
    });
    this.updateBoardSize();
  }

  onGameEnd() {
    this.gameFinished = true;
  }

  reset() {
    this.chessBoard.reset()
    this.currentFen = this.chessBoard.getFEN()
    this.eval_service.updateFen(this.currentFen);
  }
  onMoveChange() {
    const fen = this.chessBoard.getFEN();
    this.currentFen = fen
    console.log('Current FEN:', fen);
    this.eval_service.updateFen(this.currentFen);
  }

  updateBoardSize(): number {
    const viewportWidth = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    this.boardSize = viewportWidth * 0.95 > 600 ? 600 : viewportWidth * 0.95;
    console.log(viewportWidth)
    return this.boardSize;
  }

}
