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
  materialEval: MatevalModel = this.strategy_builder.material_eval;

  readonly pieceKeys: (keyof ChessPieces)[] = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];

  constructor(private strategy_builder: StrategyBuildService) {}

  ngOnInit(): void {
    this.materialEval.owner = this.sub ?? '';
  }
}
