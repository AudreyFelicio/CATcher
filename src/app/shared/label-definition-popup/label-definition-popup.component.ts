import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { DomSanitizer } from '@angular/platform-browser';

/**
 * The LabelDefinitionPopupComponent is responsible for rendering the UserDialog
 * to show the definition of the corresponding label.
 */

@Component({
  selector: 'app-label-definition-popup',
  templateUrl: './label-definition-popup.component.html',
  styleUrls: ['./label-definition-popup.component.css'],
})
export class LabelDefinitionPopupComponent {
  labelName: string;
  labelDefinitionHtmlTemplate;
  // Injection of a reference to Dialog from the Service that it is to be
  // displayed in.
  constructor(public dialogRef: MatDialogRef<LabelDefinitionPopupComponent>, @Inject(MAT_DIALOG_DATA) public data,
    private sanitizer: DomSanitizer) {
    this.labelName = data.header;
    // since we only display HTML fetched from our own source, we can safely bypass the sanitization of HTML
    this.labelDefinitionHtmlTemplate = sanitizer.bypassSecurityTrustHtml(data.body);
  }

  /**
   * Closes the dialog.
   */
  onNoClick(): void {
    this.dialogRef.close(false);
  }

}
