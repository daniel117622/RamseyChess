import { Component, OnInit } from '@angular/core';
import { StrategyCardData, StrategyDetailResponse } from 'src/models/start-card.model';
import { PlayAiService } from '../../services/play-ai.service';

@Component({
  selector: 'app-play-page',
  templateUrl: './play-page.component.html',
  styleUrls: ['./play-page.component.css'],
})
export class PlayPageComponent implements OnInit {
  cards: StrategyCardData[] = [];
  
  constructor(private play_ai: PlayAiService) {}

  ngOnInit(): void {
    this.play_ai.fetchStrategyCards().subscribe(
      (data: StrategyCardData[]) => {
        this.cards = data;
        this.cards.forEach(card => {
          let payload = { "strategy_list" : card.strategy_list }
          this.play_ai.fetchStrategyCardDetails(payload).subscribe(
            (data : StrategyDetailResponse) => {
              console.log(data)
              card.strategy_details = data
            }
          )
        });
      }
    );
  }

  getCardUrl(id: string): string {
    return `/play-ai/${id}`; 
  }
  objectEntries(obj: any): { key: string, value: any }[] {
    return Object.entries(obj).map(([key, value]) => ({ key, value }));
  }
  getPieceValue(pieces: any, key: string): number 
  {
    return (pieces as Record<string, number>)[key] ?? 0;
  }
}
