import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService, Language } from '../../i18n/i18n.service';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="language-selector" role="group" aria-label="Language selector">
      <button
        type="button"
        class="lang-btn"
        [class.active]="i18n.language() === 'pt'"
        [attr.aria-pressed]="i18n.language() === 'pt'"
        (click)="setLanguage('pt')"
        aria-label="Portuguese"
        title="Portuguese"
      >
        🇧🇷 PT
      </button>
      <button
        type="button"
        class="lang-btn"
        [class.active]="i18n.language() === 'en'"
        [attr.aria-pressed]="i18n.language() === 'en'"
        (click)="setLanguage('en')"
        aria-label="English"
        title="English"
      >
        🇺🇸 EN
      </button>
    </div>
  `,
  styles: [`
    .language-selector {
      display: flex;
      gap: 0.35rem;
      align-items: center;
    }

    .lang-btn {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: var(--text-secondary);
      padding: 0.3rem 0.6rem;
      border-radius: 999px;
      cursor: pointer;
      font-size: 0.78rem;
      font-weight: 600;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      line-height: 1;
      min-width: 48px;
    }

    .lang-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.2);
      color: var(--color-white);
    }

    .lang-btn.active {
      background: rgba(219, 194, 125, 0.18);
      color: var(--color-accent);
      border-color: rgba(219, 194, 125, 0.4);
      box-shadow: none;
    }

    @media (max-width: 768px) {
      .lang-btn {
        padding: 0.28rem 0.55rem;
        font-size: 0.76rem;
        min-width: 46px;
      }
    }
  `]
})
export class LanguageSelectorComponent {
  readonly i18n = inject(I18nService);

  setLanguage(lang: Language): void {
    this.i18n.setLanguage(lang);
  }
}
