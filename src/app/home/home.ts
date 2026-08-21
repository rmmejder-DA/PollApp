import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Hero } from '../hero/hero';
import { PollService } from '../poll.service';
import { SurveyListSection } from './survey-list-section';
import { UrgentSection } from './urgent-section';

@Component({
  selector: 'app-home-page',
  host: { id: 'home-page' },
  imports: [Hero, UrgentSection, SurveyListSection],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class HomePage {
  protected readonly service = inject(PollService);
  protected readonly view = signal<'active' | 'past'>('active');
  protected readonly category = signal('All');

  protected readonly visiblePolls = computed(() =>
    this.service.polls()
      .filter((poll) => this.view() === 'past' ? this.service.isPast(poll) : !this.service.isPast(poll))
      .filter((poll) => this.category() === 'All' || poll.category === this.category())
      .sort((first, second) => new Date(first.endsAt).getTime() - new Date(second.endsAt).getTime())
  );

  protected readonly urgentPolls = computed(() =>
    this.service.polls()
      .filter((poll) => !this.service.isPast(poll))
      .sort((first, second) => new Date(first.endsAt).getTime() - new Date(second.endsAt).getTime())
      .slice(0, 3)
  );

  protected daysLeft(poll: Parameters<PollService['isPast']>[0]): number {
    return Math.max(0, Math.ceil((new Date(poll.endsAt).getTime() - Date.now()) / 86_400_000));
  }

  protected setView(view: 'active' | 'past'): void {
    this.view.set(view);
  }

  protected setCategory(category: string): void {
    this.category.set(category);
  }
}
