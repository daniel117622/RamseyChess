import { Component, OnInit, Input } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { StrategyBuildService, BuildableStrategy } from 'src/services/strategy-build.service';
import { MatDialog } from '@angular/material/dialog'; // Import MatDialog
import { ConfirmPopupComponent } from '../confirm-popup/confirm-popup.component';
import { HttpClient } from '@angular/common/http';



@Component({
  selector: 'app-strategy-overview',
  templateUrl: './strategy-overview.component.html',
  styleUrls: ['./strategy-overview.component.css']
})
export class StrategyOverviewComponent implements OnInit {
  constructor(private strategyBuildService: StrategyBuildService, private authService : AuthService, public dialog: MatDialog, private http : HttpClient) {}

  @Input() sub: string | undefined | null = '';
  strategy_card: BuildableStrategy | null = null;



  ngOnInit(): void 
  {
    this.strategy_card = this.strategyBuildService.getFullStrategy();
    console.log("OWNER: " + this.sub)
    if (this.sub && this.strategy_card) 
    {
      this.strategy_card.owner = this.sub;
    }


  }
  objectEntries(obj: any): { key: string, value: any }[] 
  {
    return Object.entries(obj).map(([key, value]) => ({ key, value }));
  }
  getPieceValue(pieces: any, key: string): number | undefined 
  {
    return (pieces as Record<string, number>)[key];
  }


  openConfirmPopup() 
  {
    const dialogRef = this.dialog.open(
      ConfirmPopupComponent, 
      {
        width: '400px',
        hasBackdrop: true,
        disableClose: true, // Prevents closing when clicking outside the dialog
        backdropClass: 'custom-backdrop' // Custom styling for backdrop if needed
      }
    );
  
    dialogRef.afterClosed().subscribe(result => 
    {
      if (result) 
      {
        console.log("User confirmed.");
        // Handle confirmation action
      } 
      else 
      {
        console.log("User canceled.");
        // Handle cancellation action
      }
    });
  }
}