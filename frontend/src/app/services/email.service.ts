import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { resolveApiUrl } from '../utils/api-url.util';

export interface EmailData {
    name: string;
    email: string;
    subject: string;
    message: string;
}

interface ContactResponse {
    success: boolean;
    message: string;
}

@Injectable({
    providedIn: 'root'
})
export class EmailService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = resolveApiUrl('/api/contact');

    sendEmail(emailData: EmailData): Observable<boolean> {
        return this.http.post<ContactResponse>(this.apiUrl, emailData).pipe(
            map(response => response.success),
            catchError(error => {
                console.error('Erro ao enviar email:', error);
                return of(false);
            })
        );
    }
}
