import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css'
})
export class AboutComponent {
  personalInfo = {
    name: 'Wesley de Carvalho Augusto Correia',
    title: 'Desenvolvedor Full Stack Junior',
    yearsOfExperience: 2,
    location: 'Rio de Janeiro, Brasil',
    email: 'wcacorreia1995@gmail.com',
    available: true,
    bio: [
      'Sou um desenvolvedor apaixonado por tecnologia e inovação, com foco em criar soluções web modernas e escaláveis. Com mais de 2 anos de experiência, trabalhei em diversos projetos que me permitiram desenvolver habilidades tanto no frontend quanto no backend.',
      'Tenho expertise em Angular, React, Node.js, Java, Spring Boot e outras tecnologias modernas. Meu objetivo é sempre entregar código limpo, eficiente e bem documentado, seguindo as melhores práticas da indústria.',
      'Estou constantemente aprendendo e me atualizando com as últimas tendências do mercado de desenvolvimento web. Acredito que a tecnologia tem o poder de transformar vidas e melhorar o mundo.'
    ]
  };

  highlights = [
    { icon: '💼', title: 'Experiência', value: '5+ Anos' },
    { icon: '🎓', title: 'Formação', value: 'Bacharel em Direito e Cursando Ciências da Computação' },
    { icon: '🚀', title: 'Projetos', value: '5+ Concluídos' },
    { icon: '✅', title: 'Status', value: 'Disponível' }
  ];
}
