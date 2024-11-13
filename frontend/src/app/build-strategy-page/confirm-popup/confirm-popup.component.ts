import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-confirm-popup',
  templateUrl: './confirm-popup.component.html',
  styleUrls: ['./confirm-popup.component.css']
})
export class ConfirmPopupComponent {

  constructor(public dialogRef: MatDialogRef<ConfirmPopupComponent>) {}

  onConfirm(): void {
    this.dialogRef.close(true); // Pass true to indicate confirmation
  }

  onGoBack(): void {
    this.dialogRef.close(false); // Pass false to indicate cancellation
  }
}
