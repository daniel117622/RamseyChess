import { Injectable, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';



@Injectable({
  providedIn: 'root'
})
export class StrategyService implements OnInit {
  strategy = null;

  constructor(private http: HttpClient) { }

  ngOnInit(): void 
  {
    
  }

  getStrategyById(strat_id: string): void
  {

    this.http.post<any>('/api/get_single_strategy_by_id', { strat_id }).subscribe
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
