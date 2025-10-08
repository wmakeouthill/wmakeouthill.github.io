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
    { name: 'Angular', level: 85, category: 'frontend', icon: '🅰️' },
    { name: 'React', level: 80, category: 'frontend', icon: '⚛️' },
    { name: 'TypeScript', level: 90, category: 'frontend', icon: '📘' },
    { name: 'JavaScript', level: 90, category: 'frontend', icon: '📜' },
    { name: 'HTML5', level: 95, category: 'frontend', icon: '🌐' },
    { name: 'CSS3/SASS', level: 90, category: 'frontend', icon: '🎨' },
    { name: 'Tailwind CSS', level: 85, category: 'frontend', icon: '💨' },
    
    // Backend
    { name: 'Node.js', level: 80, category: 'backend', icon: '🟢' },
    { name: 'Express', level: 75, category: 'backend', icon: '🚂' },
    { name: 'NestJS', level: 70, category: 'backend', icon: '🐈' },
    { name: 'Python', level: 75, category: 'backend', icon: '🐍' },
    { name: 'Java', level: 70, category: 'backend', icon: '☕' },
    
    // Database
    { name: 'PostgreSQL', level: 80, category: 'database', icon: '🐘' },
    { name: 'MongoDB', level: 75, category: 'database', icon: '🍃' },
    { name: 'MySQL', level: 75, category: 'database', icon: '🐬' },
    { name: 'Redis', level: 65, category: 'database', icon: '🔴' },
    
    // DevOps & Tools
    { name: 'Git', level: 90, category: 'devops', icon: '🌿' },
    { name: 'Docker', level: 75, category: 'devops', icon: '🐳' },
    { name: 'CI/CD', level: 70, category: 'devops', icon: '🔄' },
    { name: 'AWS', level: 65, category: 'devops', icon: '☁️' },
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
