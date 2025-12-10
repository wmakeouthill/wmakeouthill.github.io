import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmailService, EmailData } from '../../services/email.service';
import { TranslatePipe } from '../../i18n/i18n.pipe';
import { I18nService } from '../../i18n/i18n.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css'
})
export class ContactComponent {
  private readonly emailService = inject(EmailService);
  private readonly i18n = inject(I18nService);

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
    { iconSrc: 'assets/icons/gmail.svg', labelKey: 'contact.labels.email', value: 'wcacorreia1995@gmail.com', link: 'mailto:wcacorreia1995@gmail.com' },
    { iconSrc: 'assets/icons/linkedin.svg', labelKey: 'contact.labels.linkedin', value: 'linkedin.com/in/wcacorreia', link: 'https://linkedin.com/in/wcacorreia' },
    { iconSrc: 'assets/icons/github.svg', labelKey: 'contact.labels.github', value: 'github.com/wmakeouthill', link: 'https://github.com/wmakeouthill' },
    { iconSrc: 'assets/icons/whatsapp.svg', labelKey: 'contact.labels.whatsapp', value: '+55 21 98386-6676', link: 'https://wa.me/5521983866676' },
    { iconSrc: 'assets/icons/endereco.svg', labelKey: 'contact.labels.address', value: 'Av. Leandro da Mota, Vila São Sebastião, Duque de Caxias, RJ' }
  ];

  onSubmit() {
    if (this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.submitMessage = '';
    this.submitSuccess = false;

    this.emailService.sendEmail(this.formData).subscribe({
      next: (success) => {
        if (success) {
          this.submitMessage = this.i18n.translate('contact.success');
          this.submitSuccess = true;
          this.resetForm();
        } else {
          this.submitMessage = this.i18n.translate('contact.error');
          this.submitSuccess = false;
        }
        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('Erro no envio:', error);
        this.submitMessage = this.i18n.translate('contact.error');
        this.submitSuccess = false;
        this.isSubmitting = false;
      }
    });
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
