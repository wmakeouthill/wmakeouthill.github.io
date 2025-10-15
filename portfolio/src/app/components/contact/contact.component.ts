import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmailService, EmailData } from '../../services/email.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css'
})
export class ContactComponent {
  formData: EmailData = {
    name: '',
    email: '',
    subject: '',
    message: ''
  };

  isSubmitting = false;
  submitMessage = '';
  submitSuccess = false;

  contactInfo = [
    { iconSrc: 'assets/icons/gmail.svg', label: 'Email', value: 'wcacorreia1995@gmail.com', link: 'mailto:wcacorreia1995@gmail.com' },
    { iconSrc: 'assets/icons/linkedin.svg', label: 'LinkedIn', value: 'linkedin.com/in/wcacorreia', link: 'https://linkedin.com/in/wcacorreia' },
    { iconSrc: 'assets/icons/github.svg', label: 'GitHub', value: 'github.com/wmakeouthill', link: 'https://github.com/wmakeouthill' },
    { iconSrc: 'assets/icons/whatsapp.svg', label: 'WhatsApp', value: '+55 21 98386-6676', link: 'https://wa.me/5521983866676' },
    { iconSrc: 'assets/icons/endereco.svg', label: 'Endereço', value: 'Av. Leandro da Mota, Vila São Sebastião, Duque de Caxias, RJ' }
  ];

  constructor(private emailService: EmailService) { }

  async onSubmit() {
    if (this.isSubmitting) return;

    this.isSubmitting = true;
    this.submitMessage = '';
    this.submitSuccess = false;

    try {
      const success = await this.emailService.sendEmail(this.formData);

      if (success) {
        this.submitMessage = 'Mensagem enviada com sucesso! Entrarei em contato em breve.';
        this.submitSuccess = true;
        this.resetForm();
      } else {
        this.submitMessage = 'Erro ao enviar mensagem. Tente novamente ou entre em contato diretamente pelo email.';
        this.submitSuccess = false;
      }
    } catch (error) {
      console.error('Erro no envio:', error);
      this.submitMessage = 'Erro ao enviar mensagem. Tente novamente ou entre em contato diretamente pelo email.';
      this.submitSuccess = false;
    } finally {
      this.isSubmitting = false;
    }
  }

  resetForm() {
    this.formData = {
      name: '',
      email: '',
      subject: '',
      message: ''
    };
    this.submitMessage = '';
    this.submitSuccess = false;
  }
}
