import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, output, signal, untracked, viewChild } from '@angular/core';

import { I18nService } from '../../../i18n/i18n.service';
import { TranslatePipe } from '../../../i18n/i18n.pipe';
import { CaseItem } from '../../../models/interfaces';
import { CasesService } from '../../../services/cases.service';
import { CaseCardComponent } from '../case-card/case-card.component';

type CaseFilter = 'all' | 'freela' | 'autou';

/** Aba Profissionais: grid de cases com filtros e paginacao por linhas cheias. */
@Component({
  selector: 'app-professional-cases',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslatePipe, CaseCardComponent],
  templateUrl: './professional-cases.component.html',
  styleUrl: './professional-cases.component.css'
})
export class ProfessionalCasesComponent {
  private readonly casesService = inject(CasesService);
  private readonly i18n = inject(I18nService);

  readonly readCase = output<string>();
  readonly openGallery = output<CaseItem>();

  readonly casesGrid = viewChild<ElementRef<HTMLElement>>('casesGrid');

  readonly cases = signal<CaseItem[]>([]);
  readonly loading = signal<boolean>(true);
  readonly filter = signal<CaseFilter>('all');
  readonly currentPage = signal<number>(1);

  private readonly gridColumns = signal<number>(3);
  private readonly rowsPerPage = 2;

  readonly itemsPerPage = computed(() => Math.max(1, this.gridColumns()) * this.rowsPerPage);

  readonly filteredCases = computed(() => {
    const filter = this.filter();
    const cases = this.cases();
    return filter === 'all' ? cases : cases.filter(caseItem => caseItem.category === filter);
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredCases().length / this.itemsPerPage()))
  );

  readonly paginatedCases = computed(() => {
    const perPage = this.itemsPerPage();
    const start = (this.currentPage() - 1) * perPage;
    return this.filteredCases().slice(start, start + perPage);
  });

  readonly pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, index) => index + 1)
  );

  private readonly loadOnLanguageChange = effect((onCleanup) => {
    const lang = this.i18n.language();
    this.loading.set(true);
    const subscription = this.casesService.getCases(lang).subscribe(cases => {
      this.cases.set(cases);
      this.currentPage.set(1);
      this.loading.set(false);
    });
    onCleanup(() => subscription.unsubscribe());
  });

  private readonly measureGridColumns = effect((onCleanup) => {
    if (!this.isBrowser() || typeof ResizeObserver === 'undefined') {
      return;
    }
    const gridRef = this.casesGrid();
    if (!gridRef?.nativeElement) {
      return;
    }
    const el = gridRef.nativeElement;
    const update = () => {
      const template = getComputedStyle(el).gridTemplateColumns;
      const cols = template.split(' ').filter(token => token && token !== 'none').length;
      if (cols > 0) {
        this.gridColumns.set(cols);
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    onCleanup(() => observer.disconnect());
  });

  private readonly clampCurrentPage = effect(() => {
    const total = this.totalPages();
    if (untracked(() => this.currentPage()) > total) {
      this.currentPage.set(total);
    }
  });

  setFilter(filter: CaseFilter): void {
    this.filter.set(filter);
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }
}