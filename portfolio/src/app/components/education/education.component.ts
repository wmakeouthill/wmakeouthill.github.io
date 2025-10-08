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
      institution: 'Universidade Federal de São Paulo',
      degree: 'Bacharelado',
      field: 'Ciência da Computação',
      startDate: '2019-02',
      endDate: null,
      current: true,
      description: 'Formação em Ciência da Computação com foco em desenvolvimento de software e arquitetura de sistemas.',
      grade: '8.5/10'
    },
    {
      id: 2,
      institution: 'Escola Técnica Estadual',
      degree: 'Técnico',
      field: 'Informática',
      startDate: '2016-02',
      endDate: '2018-12',
      current: false,
      description: 'Curso técnico com foco em desenvolvimento web e programação.',
      grade: '9.0/10'
    }
  ];

  formatDate(date: string): string {
    const [year, month] = date.split('-');
    return `${year}`;
  }
}
