import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { StrategyBuildService } from 'src/services/strategy-build.service';
import { timeout, catchError} from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-confirm-popup',
  templateUrl: './confirm-popup.component.html',
  styleUrls: ['./confirm-popup.component.css']
})
export class ConfirmPopupComponent {
  dialog_text : string = "Are you sure?"

  constructor(public dialogRef: MatDialogRef<ConfirmPopupComponent>, private strategyBuildService: StrategyBuildService) {}

  onConfirm(): void {
    this.dialog_text = "Saving your strategy..."
    this.strategyBuildService.saveStrategy().pipe(
      timeout(5000), // Timeout after 5 seconds
      catchError(error => {
          console.error('Error saving strategy or request timed out:', error);
          return of(null); // Return a null observable to prevent further errors
          this.dialog_text = "Could not save your strategy :("
      })

  ).subscribe(
      (response: any) => 
      {
          if (response.success) 
          {
              console.log('Strategy saved successfully:', response.message);
          }
          this.dialogRef.close(true); // Pass true to indicate confirmation
      }
    )
  }

  onGoBack(): void {
    this.dialogRef.close(false); // Pass false to indicate cancellation
  }
}
