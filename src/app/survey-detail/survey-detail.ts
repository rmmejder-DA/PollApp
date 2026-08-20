import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Poll, PollService } from '../poll.service';

@Component({
  selector: 'app-survey-detail',
  templateUrl: './survey-detail.html',
  styleUrl: './survey-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class SurveyDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly service = inject(PollService);
  protected readonly voted = signal<string[]>([]);
  protected readonly poll = computed(() =>
    this.service.polls().find((item) => item.id === this.route.snapshot.paramMap.get('id')) ?? null
  );

  protected goBack(): void {
    this.router.navigate(['/']);
  }

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
}
