import { Injectable } from '@angular/core';
import emailjs from '@emailjs/browser';

export interface EmailData {
    name: string;
    email: string;
    subject: string;
    message: string;
}

@Injectable({
    providedIn: 'root'
})
export class EmailService {
    private readonly SERVICE_ID = 'service_whwd5tc';
    private readonly TEMPLATE_ID = 'template_f097n7d';
    private readonly PUBLIC_KEY = 'pTMMNG1wVZVhfan-j';

    constructor() {
        // Inicializar EmailJS
        emailjs.init(this.PUBLIC_KEY);
    }

    async sendEmail(emailData: EmailData): Promise<boolean> {
        try {
            const templateParams = {
                from_name: emailData.name,
                from_email: emailData.email,
                subject: emailData.subject,
                message: emailData.message,
                to_email: 'wcacorreia1995@gmail.com' // Seu email de destino
            };

            const response = await emailjs.send(
                this.SERVICE_ID,
                this.TEMPLATE_ID,
                templateParams
            );

            console.log('Email enviado com sucesso:', response);
            return true;
        } catch (error) {
            console.error('Erro ao enviar email:', error);
            return false;
        }
    }
}
