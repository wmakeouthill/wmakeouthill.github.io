import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';

import { I18nService } from '../../../i18n/i18n.service';
import { TranslatePipe } from '../../../i18n/i18n.pipe';
import { CaseItem } from '../../../models/interfaces';

/** Card de case profissional no grid da aba Profissionais. */
@Component({
  selector: 'app-case-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './case-card.component.html',
  styleUrl: './case-card.component.css'
})
export class CaseCardComponent {
  private readonly i18n = inject(I18nService);

  readonly caseItem = input.required<CaseItem>({ alias: 'case' });
  readonly readCase = output<string>();
  readonly openGallery = output<CaseItem>();

  readonly caseHref = computed(() => {
    const slug = this.caseItem().slug;
    return this.i18n.language() === 'en' ? `/en/cases/${slug}` : `/cases/${slug}`;
  });

  readonly isDemo = computed(() => (this.caseItem().status ?? '').toLowerCase().includes('demo'));

  readonly isLogoCover = computed(() => {
    const item = this.caseItem();
    const cover = item.coverUrl;
    if (!cover) {
      return false;
    }
    return cover === item.logoUrl || cover.toLowerCase().includes('.svg');
  });

  onReadCase(event: MouseEvent): void {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1) {
      return;
    }
    event.preventDefault();
    this.readCase.emit(this.caseItem().slug);
  }
}