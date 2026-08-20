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
  protected readonly selectedOptions = signal<string[]>([]);
  protected readonly poll = computed(() =>
    this.service.polls().find((item) => item.id === this.route.snapshot.paramMap.get('id')) ?? null
  );

  protected goBack(): void {
    this.router.navigate(['/']);
  }

  protected goToCreate(): void {
    this.router.navigate(['/new-survey']);
  }

  protected toggleOption(poll: Poll, optionId: string): void {
    if (this.service.isPast(poll) || this.isVoted(poll)) return;
    this.selectedOptions.update((options) =>
      options.includes(optionId) ? options.filter((id) => id !== optionId) : [...options, optionId],
    );
  }

  protected isSelected(optionId: string): boolean {
    return this.selectedOptions().includes(optionId);
  }

  protected async submitVotes(poll: Poll): Promise<void> {
    if (this.service.isPast(poll) || this.isVoted(poll) || !this.selectedOptions().length) return;
    if (await this.service.voteMany(poll.id, this.selectedOptions())) {
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

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  }

  protected statusLabel(poll: Poll): string {
    return this.service.isPast(poll) ? 'Closed' : 'Published';
  }
}
