import { Component, OnInit, Input } from '@angular/core';
import { MatevalModel, ChessPieces } from 'src/models/mate-eval.model';
import { StrategyBuildService } from 'src/services/strategy-build.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-material-form',
  templateUrl: './material-form.component.html',
  styleUrls: ['./material-form.component.css']
})
export class MaterialFormComponent implements OnInit {
  @Input() sub: string | undefined | null = '';
  materialEval: MatevalModel;

  readonly pieceKeys: (keyof ChessPieces)[] = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];
  readonly pieceMap: Record<string, string> = {
    pawn  : 'p',
    knight: 'n',
    bishop: 'b',
    rook  : 'r',
    queen : 'q',
    king  : 'k'
  };

  constructor(private strategy_builder: StrategyBuildService, private http: HttpClient) {
    this.materialEval = this.strategy_builder.material_eval
  }

  ngOnInit(): void 
  {
    this.materialEval.owner = this.sub ?? '';
  }
  
  requestName (): void
  {
    const payload = {
      doc: {
        whitePieces: this.materialEval.whitePieces,
        blackPieces: this.materialEval.blackPieces
      }
    };

    this.http.post<{ text: string }>('/gpt/request_name', payload).subscribe(
    {
      next: (res) =>
      {
        this.materialEval.name = res.text;
      },
      error: (err) =>
      {
        console.error('GPT naming failed:', err);
      }
    });
  }



}
