import { Component } from '@angular/core';
import { StrategyBuildService, StrategyCardData } from 'src/services/strategy-build.service';

@Component({
  selector: 'app-strategy-overview',
  templateUrl: './strategy-overview.component.html',
  styleUrls: ['./strategy-overview.component.css']
})
export class StrategyOverviewComponent {
  constructor(private strategyBuildService: StrategyBuildService) {}

  strategy_card: StrategyCardData[] = []
  
  ngOnInit(): void 
  {
    this.strategy_card = this.strategyBuildService.getMockStrategy();
  }
  objectEntries(obj: any): { key: string, value: any }[] 
  {
    return Object.entries(obj).map(([key, value]) => ({ key, value }));
  }
  getPieceValue(pieces: any, key: string): number | undefined 
  {
    return (pieces as Record<string, number>)[key];
  }
}