import { Component, OnInit, Input } from '@angular/core';
import { MatevalModel, ChessPieces } from 'src/models/mate-eval.model';
import { StrategyBuildService } from 'src/services/strategy-build.service';

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

  constructor(private strategy_builder: StrategyBuildService) {
    this.materialEval = this.strategy_builder.material_eval
  }

  ngOnInit(): void 
  {
    this.materialEval.owner = this.sub ?? '';
  }

}
