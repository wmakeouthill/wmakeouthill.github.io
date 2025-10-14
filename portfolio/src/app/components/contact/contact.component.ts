import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css'
})
export class ContactComponent {
  formData = {
    name: '',
    email: '',
    subject: '',
    message: ''
  };

  contactInfo = [
    { icon: '✉️', label: 'Email', value: 'seuemail@exemplo.com', link: 'mailto:seuemail@exemplo.com' },
    { icon: '💼', label: 'LinkedIn', value: 'linkedin.com/in/seu-perfil', link: 'https://linkedin.com/in/seu-perfil' },
    { icon: '🔗', label: 'GitHub', value: 'github.com/wmakeouthill', link: 'https://github.com/wmakeouthill' },
    { icon: '📱', label: 'WhatsApp', value: '+55 11 99999-9999', link: 'https://wa.me/5511999999999' }
  ];

  onSubmit() {
    console.log('Form submitted:', this.formData);
    alert('Funcionalidade de envio será implementada! Por enquanto, entre em contato diretamente pelo email.');
    this.resetForm();
  }

  resetForm() {
    this.formData = {
      name: '',
      email: '',
      subject: '',
      message: ''
    };
  }
}
