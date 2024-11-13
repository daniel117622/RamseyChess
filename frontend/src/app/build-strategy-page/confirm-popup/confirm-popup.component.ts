import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { StrategyBuildService } from 'src/services/strategy-build.service';

@Component({
  selector: 'app-confirm-popup',
  templateUrl: './confirm-popup.component.html',
  styleUrls: ['./confirm-popup.component.css']
})
export class ConfirmPopupComponent {

  constructor(public dialogRef: MatDialogRef<ConfirmPopupComponent>, private strategyBuildService: StrategyBuildService) {}

  onConfirm(): void {
    this.dialogRef.close(true); // Pass true to indicate confirmation
    this.strategyBuildService.saveStrategy()
  }

  onGoBack(): void {
    this.dialogRef.close(false); // Pass false to indicate cancellation
  }
}
