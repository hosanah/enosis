import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';
import { extractErrorMessage } from '../utils';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const messageService = inject(MessageService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const detail = extractErrorMessage(err);
      messageService.add({ severity: 'error', summary: 'Erro', detail });
      return throwError(() => err);
    })
  );
};
