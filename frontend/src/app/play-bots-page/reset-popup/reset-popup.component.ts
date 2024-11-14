import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-reset-popup',
  templateUrl: './reset-popup.component.html',
  styleUrls: ['./reset-popup.component.css']
})
export class ResetPopupComponent {
  constructor(
    public dialogRef: MatDialogRef<ResetPopupComponent>,
    @Inject(MAT_DIALOG_DATA) public game_result: string // Inject game_result as a string
  ) {}
  onConfirm(): void {
    this.dialogRef.close(true); // Pass true to indicate confirmation
  }

  onGoBack(): void {
    this.dialogRef.close(false); // Pass false to indicate cancellation
  }
}
