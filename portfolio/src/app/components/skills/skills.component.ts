import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Skill } from '../../models/interfaces';

@Component({
  selector: 'app-skills',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skills.component.html',
  styleUrl: './skills.component.css'
})
export class SkillsComponent {
  skills: Skill[] = [
    // Frontend
    { name: 'Angular', level: 90, category: 'frontend', icon: '🅰️' },
    { name: 'TypeScript', level: 90, category: 'frontend', icon: '📘' },
    { name: 'JavaScript', level: 90, category: 'frontend', icon: '�' },
    { name: 'HTML5', level: 95, category: 'frontend', icon: '🌐' },
    { name: 'CSS3/SCSS', level: 90, category: 'frontend', icon: '�' },

    // Backend
    { name: 'Java', level: 85, category: 'backend', icon: '☕' },
    { name: 'Spring', level: 80, category: 'backend', icon: '🌱' },
    { name: 'Spring Boot', level: 80, category: 'backend', icon: '�' },
    { name: 'SQL', level: 85, category: 'backend', icon: '�️' },

    // Database
    { name: 'PostgreSQL', level: 85, category: 'database', icon: '�' },
    { name: 'MySQL', level: 80, category: 'database', icon: '�' },
    { name: 'Oracle', level: 75, category: 'database', icon: '🔷' },

    // DevOps & Tools
    { name: 'Docker', level: 80, category: 'devops', icon: '�' },
    { name: 'Podman', level: 70, category: 'devops', icon: '📦' },
    { name: 'Kubernetes', level: 70, category: 'devops', icon: '☸️' },
    { name: 'Liquibase', level: 70, category: 'devops', icon: '�' },
    { name: 'Prometheus', level: 70, category: 'devops', icon: '📈' },
    { name: 'Grafana', level: 70, category: 'devops', icon: '�' },
    { name: 'Git', level: 90, category: 'devops', icon: '🌿' },
    { name: 'Docker Compose', level: 75, category: 'devops', icon: '🧩' }
  ];

  categories = [
    { key: 'frontend', label: 'Frontend', icon: '💻' },
    { key: 'backend', label: 'Backend', icon: '⚙️' },
    { key: 'database', label: 'Database', icon: '🗄️' },
    { key: 'devops', label: 'DevOps & Tools', icon: '🛠️' }
  ];

  getSkillsByCategory(category: string): Skill[] {
    return this.skills.filter(skill => skill.category === category);
  }
}
