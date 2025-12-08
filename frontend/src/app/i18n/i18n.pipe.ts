import { ChangeDetectorRef, Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from './i18n.service';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false
})
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);
  private readonly cdr = inject(ChangeDetectorRef);

  transform(key: string, params?: Record<string, unknown>): string {
    // Depende dos signals para disparar change detection
    this.i18n.language();
    this.i18n.translationsSignal();
    // Garante atualização do template
    this.cdr.markForCheck();
    return this.i18n.translate(key, params);
  }
}
