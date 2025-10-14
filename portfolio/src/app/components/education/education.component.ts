import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Education } from '../../models/interfaces';

@Component({
  selector: 'app-education',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './education.component.html',
  styleUrl: './education.component.css'
})
export class EducationComponent {
  education: Education[] = [
    {
      id: 1,
      institution: 'Faculdade FACINT',
      degree: 'Pós-Graduação',
      field: 'Full Stack Java Developer',
      startDate: '2025-08',
      endDate: '2026-05',
      current: false,
      description: 'Pós-graduação focada em desenvolvimento Java Full Stack com ênfase em Spring e práticas modernas de desenvolvimento.'
    },
    {
      id: 2,
      institution: 'Centro Universitário Unigama',
      degree: 'Pós-Graduação',
      field: 'Gestão de Projetos',
      startDate: '2025-01',
      endDate: '2025-12',
      current: false,
      description: 'Pós-graduação em gestão de projetos com foco em práticas Ágeis e PMI.'
    },
    {
      id: 3,
      institution: 'Faculdade GRAN',
      degree: 'Licenciatura / Bacharelado (em andamento)',
      field: 'Ciências da Computação',
      startDate: '2024-02',
      endDate: '2027-08',
      current: true,
      description: 'Curso de graduação em Ciências da Computação (em andamento).'
    },
    {
      id: 4,
      institution: 'Centro Universitário Unigama',
      degree: 'Graduação',
      field: 'Direito',
      startDate: '2018-02',
      endDate: '2022-12',
      current: false,
      description: 'Bacharel em Direito.'
    }
  ];

  formatDate(date: string): string {
    const [year, month] = date.split('-');
    return `${year}`;
  }
}
