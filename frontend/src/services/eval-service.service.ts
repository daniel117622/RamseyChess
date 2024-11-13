import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { NextMove } from 'src/models/next-move.model';
import { MatevalModel } from 'src/models/mate-eval.model';




@Injectable({
  providedIn: 'root'
})
export class EvalService {
  currentFen$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  currentEvalModel$: BehaviorSubject<MatevalModel | null> = new BehaviorSubject<MatevalModel | null>(null);
  
  bestMove$: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);
  bestMoveReadable$: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);
  currentDepth$: BehaviorSubject<number | null> = new BehaviorSubject<number | null>(null);

constructor(private http: HttpClient) {}

  // Method to update the currentEvalModel
  updateEvalModel(newModel: MatevalModel) {
    this.currentEvalModel$.next(newModel);
  }

  // Method to update the currentFen
  updateFen(newFen: string) {
    this.currentFen$.next(newFen);
  }

  updateDepth(newDepth : number)
  {
    this.currentDepth$.next(newDepth);
  }

  requestMoveByStratId(strat_id: string): Promise<NextMove | {}> {
    return new Promise((resolve, reject) => {
      const payload = { strategy_id: strat_id };
      this.http.post<NextMove>('/get_best_move_by_strategy_id', payload).subscribe(
        (response: NextMove) => {
          console.log('Response from server:', response);
          if (response && response.best_move) {
            this.bestMove$.next(response.best_move);
            resolve({"best_move": response.best_move});
          } else {
            resolve({});
          }
        },
        (error) => {
          console.error('Error occurred:', error);
          reject(error);
        }
      );
    });
  }
  // Method to send execution request
  sendExec(): Promise<{ best_move: string | null, best_move_readable: string | null } | null> {
    return new Promise((resolve, reject) => {
      const currentModel = this.currentEvalModel$.getValue();
      const currentFen = this.currentFen$.getValue();
      const moveDepth = this.currentDepth$.getValue();
  
      if (!currentModel || !currentFen || moveDepth === null) {
        resolve(null);  // Ensure depth is available before proceeding
        return;
      }  
      const payload = { model: currentModel, fen: currentFen, depth: moveDepth };
      this.http.post('/api/submit_exec', payload).subscribe(
        (response: any) => {
          console.log('Response from server:', response);
          this.bestMove$.next(response.best_move);
          this.bestMoveReadable$.next(response.best_move_readable);
          resolve({
            best_move: this.bestMove$.getValue(),
            best_move_readable: this.bestMoveReadable$.getValue()
          });
        },
        (error) => {
          console.error('Error occurred:', error);
          reject(error);
        }
      );
    });


  }
}