import { ErrorHandler, Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarRef } from '@angular/material';
import { GeneralMessageErrorComponent } from '../../shared/error-toasters/general-message-error/general-message-error.component';
import { FormErrorComponent } from '../../shared/error-toasters/form-error/form-error.component';
import { HttpErrorResponse } from '@angular/common/http';
import { RequestError } from '@octokit/request-error';
import { LoggingService } from './logging.service';

export const ERRORCODE_NOT_FOUND = 404;

const FILTERABLE = ['node_modules'];

@Injectable({
  providedIn: 'root',
})
export class ErrorHandlingService implements ErrorHandler {
  snackBarAutoCloseTime = 3000;

  constructor(private snackBar: MatSnackBar, private logger: LoggingService) {}

  handleError(error: HttpErrorResponse | Error | RequestError, actionCallback?: () => void) {
    this.logger.error(error);
    if (error instanceof Error) {
      this.logger.error(this.cleanStack(error.stack));
    }
    if (error instanceof HttpErrorResponse || error instanceof RequestError) {
      this.handleHttpError(error, actionCallback);
    } else {
      this.handleGeneralError(error.message || JSON.stringify(error));
    }
  }

  private addAutoClose<T>(snackBarRef: MatSnackBarRef<T>) {
    setTimeout(() => {
      snackBarRef.dismiss();
    }, this.snackBarAutoCloseTime);
  }

  private cleanStack(stacktrace: string): string {
    return stacktrace
            .split('\n')
            .filter(line => !FILTERABLE.some(word => line.includes(word))) // exclude lines that contain words in FILTERABLE
            .join('\n');
  }

  // Ref: https://developer.github.com/v3/#client-errors
  private handleHttpError(error: HttpErrorResponse | RequestError, actionCallback?: () => void): void {
    let snackBarRef = null;
    // Angular treats 304 Not Modified as an error, we will ignore it.
    if (error.status === 304) {
      return;
    }

    if (!navigator.onLine) {
      snackBarRef = this.handleGeneralError('No Internet Connection');
      this.addAutoClose(snackBarRef);
      return;
    }

    switch (error.status) {
      case 500: // Internal Server Error.
        snackBarRef = this.snackBar.openFromComponent(GeneralMessageErrorComponent, {data: error});
        break;
      case 422: // Form errors
        snackBarRef = this.snackBar.openFromComponent(FormErrorComponent, {data: error});
        break;
      case 400: // Bad request
      case 401: // Unauthorized
      case 404: // Not found
        snackBarRef = this.snackBar.openFromComponent(GeneralMessageErrorComponent, {data: error});
        break;
      default:
        snackBarRef = this.snackBar.openFromComponent(GeneralMessageErrorComponent, {data: error});
    }

    if (snackBarRef) {
      this.addAutoClose(snackBarRef);
    }
  }

  private handleGeneralError(error: string): void {
    const snackBarRef = this.snackBar.openFromComponent(GeneralMessageErrorComponent, {data: {message: error}});
    this.addAutoClose(snackBarRef);
  }
}
