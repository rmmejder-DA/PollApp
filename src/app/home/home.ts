import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Hero } from '../hero/hero';
import { Poll, PollService } from '../poll.service';
import { PastSurveysSection } from './past-surveys-section';
import { SurveyListSection } from './survey-list-section';
import { UrgentSection } from './urgent-section';

@Component({
  selector: 'app-home-page',
  host: { id: 'home-page' },
  imports: [Hero, UrgentSection, SurveyListSection, PastSurveysSection],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class HomePage {
  private readonly router = inject(Router);
  protected readonly service = inject(PollService);
  protected readonly voted = signal<string[]>([]);

  protected readonly activePolls = computed(() =>
    this.service.polls().filter((poll) => !this.service.isPast(poll))
  );

  protected readonly pastPolls = computed(() =>
    this.service.polls().filter((poll) => this.service.isPast(poll))
  );

  protected readonly urgentPolls = computed(() =>
    this.activePolls()
      .filter((poll) => this.daysLeft(poll) <= 7)
      .sort((first, second) => new Date(first.endsAt).getTime() - new Date(second.endsAt).getTime())
  );

  protected goToCreate(): void {
    this.router.navigate(['/new-survey']);
  }

  protected async vote(poll: Poll, optionId: string): Promise<void> {
    if (this.service.isPast(poll) || this.voted().includes(poll.id)) return;
    if (await this.service.vote(poll.id, optionId)) {
      this.voted.update((ids) => [...ids, poll.id]);
    }
  }

  protected isVoted(poll: Poll): boolean {
    return this.voted().includes(poll.id);
  }

  protected total(poll: Poll): number {
    return poll.options.reduce((sum, option) => sum + option.votes, 0);
  }

  protected percent(poll: Poll, votes: number): number {
    return this.total(poll) ? Math.round((votes / this.total(poll)) * 100) : 0;
  }

  protected daysLeft(poll: Poll): number {
    return Math.ceil((new Date(poll.endsAt).getTime() - Date.now()) / 86_400_000);
  }

  protected date(poll: Poll): string {
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' }).format(new Date(poll.endsAt));
  }
}
