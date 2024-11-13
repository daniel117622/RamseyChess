import { Component, Input } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EvalService } from '../../../services/eval-service.service';
import { MatevalModel } from 'src/models/mate-eval.model';


@Component({
  selector: 'app-mat-eval',
  templateUrl: './mateval.component.html',
  styleUrls: ['./mateval.component.css']
})
export class MatevalComponent {
  @Input() currentFen : string = "";
  isRequesting: boolean = false;
  model: MatevalModel = {
    name: 'default',
    whitePieces: {
      pawn  : 1,
      knight: 3,
      bishop: 3,
      rook  : 5,
      queen : 9,
      king  : 20
    },
    blackPieces: {
      pawn  : -1,
      knight: -3,
      bishop: -3,
      rook  : -5,
      queen : -9,
      king  : -20
    },
    owner: null,
    collection: "evaluate_material"
  };
  bestMove : string | null = null

  constructor(private http: HttpClient, private eval_service : EvalService) {}

  validateFloat(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    
    if (inputElement) {
      const value = parseFloat(inputElement.value);
      if (isNaN(value)) {
        inputElement.value = ''; 
      }
    }
  }
  onSubmit(): void {
    console.log('Form submitted:', this.model);
  }

  pingFlask(): void {
    if (this.isRequesting) {
      return;
    }
    // Update the service with the current model and FEN
    this.eval_service.updateEvalModel(this.model);
    console.log("REQUESTING" + this.isRequesting)
    this.isRequesting = true;
    console.log("REQUESTING" + this.isRequesting)
    // Call the sendExec() method, which now just triggers the request, 
    // and handle the results via subscription to bestMove$ and bestMoveReadable$
    this.eval_service.sendExec()
      .catch((error) => {
        console.error('Error occurred during request:', error);
        this.isRequesting = false;
      });
    
    // Subscribe to the bestMove$ observable
    this.eval_service.bestMoveReadable$.subscribe((bestMove: string | null) => {
      if (bestMove) {
        this.bestMove = bestMove;
        console.log('Best move:', this.bestMove);
        this.isRequesting = false; // Stop requesting when a result is received
      } else {
        console.log('No best move found.');
      }     
    });
  }

}
