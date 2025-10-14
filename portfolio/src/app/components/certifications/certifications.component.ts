import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Certification } from '../../models/interfaces';

@Component({
  selector: 'app-certifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './certifications.component.html',
  styleUrl: './certifications.component.css'
})
export class CertificationsComponent {
  certifications: Certification[] = [
    {
      id: 1,
      name: 'Angular - The Complete Guide',
      issuer: 'Udemy',
      issueDate: '2023-08',
      credentialUrl: 'https://udemy.com',
      image: 'https://placehold.co/300x200/002E59/DBC27D?text=Angular'
    },
    {
      id: 2,
      name: 'AWS Certified Developer',
      issuer: 'Amazon Web Services',
      issueDate: '2023-06',
      expiryDate: '2026-06',
      credentialUrl: 'https://aws.amazon.com',
      image: 'https://placehold.co/300x200/002E59/DBC27D?text=AWS'
    },
    {
      id: 3,
      name: 'Professional Scrum Master I',
      issuer: 'Scrum.org',
      issueDate: '2023-03',
      credentialUrl: 'https://scrum.org',
      image: 'https://placehold.co/300x200/002E59/DBC27D?text=PSM+I'
    },
    {
      id: 4,
      name: 'Node.js Development',
      issuer: 'Coursera',
      issueDate: '2022-11',
      credentialUrl: 'https://coursera.org',
      image: 'https://placehold.co/300x200/002E59/DBC27D?text=Node.js'
    }
  ];

  formatDate(date: string): string {
    const [year, month] = date.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(month) - 1]} ${year}`;
  }
}
