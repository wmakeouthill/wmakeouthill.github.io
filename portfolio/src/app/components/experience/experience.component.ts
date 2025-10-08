import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Experience } from '../../models/interfaces';

@Component({
  selector: 'app-experience',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './experience.component.html',
  styleUrl: './experience.component.css'
})
export class ExperienceComponent {
  experiences: Experience[] = [
    {
      id: 1,
      company: 'Tech Solutions Ltd.',
      position: 'Desenvolvedor Full Stack',
      startDate: '2023-01',
      endDate: null,
      current: true,
      location: 'São Paulo, SP',
      description: 'Desenvolvimento de aplicações web completas utilizando Angular, Node.js e PostgreSQL. Participação ativa em decisões de arquitetura e implementação de features complexas.',
      technologies: ['Angular', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker']
    },
    {
      id: 2,
      company: 'Digital Innovations Inc.',
      position: 'Desenvolvedor Frontend',
      startDate: '2022-03',
      endDate: '2022-12',
      current: false,
      location: 'Remoto',
      description: 'Criação de interfaces responsivas e performáticas usando React e Next.js. Colaboração com equipe de design para implementar pixel-perfect UI/UX.',
      technologies: ['React', 'Next.js', 'Tailwind CSS', 'TypeScript']
    },
    {
      id: 3,
      company: 'StartUp XYZ',
      position: 'Desenvolvedor Junior',
      startDate: '2021-06',
      endDate: '2022-02',
      current: false,
      location: 'São Paulo, SP',
      description: 'Desenvolvimento e manutenção de aplicações web. Aprendizado de metodologias ágeis e boas práticas de desenvolvimento.',
      technologies: ['JavaScript', 'HTML', 'CSS', 'PHP', 'MySQL']
    }
  ];

  formatDate(date: string): string {
    const [year, month] = date.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(month) - 1]} ${year}`;
  }
}
