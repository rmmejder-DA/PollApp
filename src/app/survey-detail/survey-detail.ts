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
  protected readonly selectedOptionIds = signal<string[]>([]);
  protected readonly isSubmitting = signal(false);
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
    if (this.service.isPast(poll) || this.isVoted(poll) || this.isSubmitting()) return;
    this.selectedOptionIds.update((ids) =>
      ids.includes(optionId) ? ids.filter((id) => id !== optionId) : [...ids, optionId],
    );
  }

  protected isSelected(optionId: string): boolean {
    return this.selectedOptionIds().includes(optionId);
  }

  protected async completeSurvey(poll: Poll): Promise<void> {
    if (this.service.isPast(poll) || this.isVoted(poll) || this.isSubmitting() || !this.selectedOptionIds().length) return;
    this.isSubmitting.set(true);
    if (await this.service.voteMany(poll.id, this.selectedOptionIds())) {
      this.voted.update((ids) => [...ids, poll.id]);
    }
    this.goBack();
  }

  protected isVoted(poll: Poll): boolean {
    return this.voted().includes(poll.id);
  }

  protected total(poll: Poll): number {
    return poll.options.reduce((sum, option) => sum + option.votes, 0);
  }

  protected percent(_poll: Poll, votes: number): number {
    return Math.min(100, votes);
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
