import { Component } from '@angular/core';

import { MatevalModel } from 'src/models/mate-eval.model';
import { StrategyBuildService } from 'src/services/strategy-build.service';

@Component({
  selector: 'app-material-form',
  templateUrl: './material-form.component.html',
  styleUrls: ['./material-form.component.css']
})
export class MaterialFormComponent {

  materialEval = this.strategy_builder.material_eval;

  constructor(private strategy_builder : StrategyBuildService) {}

  

}
