
import { Injectable, OnInit , Component} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

interface Strategy {
  _id: {
    $oid: string;
  };
  blackPieces: {
    bishop: number;
    king  : number;
    knight: number;
    pawn  : number;
    queen : number;
    rook  : number;
  };
  name: string;
  owner: string | null;
  type: string;
  whitePieces: {
    bishop: number;
    king  : number;
    knight: number;
    pawn  : number;
    queen : number;
    rook  : number;
  };
}

interface AiPremadeStratDoc {
  _id: {
    $oid: string;
  };
  elo          : number;
  losses       : number;
  name         : string;
  owner        : string;
  strategy_list: Strategy[];
  wins         : number;
}


@Component({
  selector: 'app-view-strategy',  
  templateUrl: './view-strategy.component.html',
  styleUrls: ['./view-strategy.component.css']  
})
export class ViewStrategyComponent implements OnInit {

  strategy: AiPremadeStratDoc | null = null;

  constructor(
    private http : HttpClient,
    private route: ActivatedRoute
  ) 
  { }

  ngOnInit(): void 
  {
    const strat_id = this.route.snapshot.paramMap.get('id');
    
    if (strat_id) 
    {
      this.getStrategyById(strat_id);
    } 
    else 
    {
      console.error('Strategy ID is missing.');
    }
  }

  getStrategyById(strat_id: string): void
  {

    this.http.post<AiPremadeStratDoc>('/api/get_single_strategy_by_id', { strat_id }).subscribe
    (
      {
        next: (data) =>
        {
          this.strategy = data;  
          console.log(data)
        }
      }
    );
  }
}