import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Poll, PollService } from '../../core/services/poll.service';

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
  protected readonly poll = computed(() => {
    const categoryParam = this.route.snapshot.paramMap.get('category');
    const questionIdParam = this.route.snapshot.paramMap.get('questionId');
    const legacyIdParam = this.route.snapshot.paramMap.get('id');

    if (questionIdParam) {
      return this.service.polls().find((item) => item.questionId === questionIdParam) ?? null;
    }

    if (legacyIdParam) {
      return this.service.polls().find((item) => item.id === legacyIdParam) ?? null;
    }

    if (categoryParam) {
      return this.service.polls().find((item) => item.category.toLowerCase() === categoryParam.toLowerCase()) ?? null;
    }

    return null;
  });

  protected readonly surveyQuestions = computed(() => {
    const current = this.poll();
    if (!current) return [];
    const related = this.service.polls().filter(
      (item) => item.description === current.description && item.category === current.category
    );
    return related.length > 0 ? related : [current];
  });

  protected goBack(): void {
    this.router.navigate(['/']);
  }

  protected goToCreate(): void {
    this.router.navigate(['/new-survey']);
  }

  protected toggleOption(poll: Poll, optionId: string): void {
    if (this.service.isPast(poll) || this.isVoted(poll) || this.isSubmitting()) return;
    this.selectedOptionIds.update((ids) => {
      if (ids.includes(optionId)) {
        return ids.filter((id) => id !== optionId);
      }

      if (poll.allowMultiple) {
        return [...ids, optionId];
      }

      const optionIds = new Set(poll.options.map((option) => option.id));
      return [...ids.filter((id) => !optionIds.has(id)), optionId];
    });
  }

  protected isSelected(optionId: string): boolean {
    return this.selectedOptionIds().includes(optionId);
  }

  protected async completeSurvey(mainPoll: Poll): Promise<void> {
    const selectedIds = this.selectedOptionIds();
    if (this.service.isPast(mainPoll) || this.isSubmitting() || !selectedIds.length) return;
    this.isSubmitting.set(true);
    try {
      const questions = this.surveyQuestions();
      for (const question of questions) {
        const questionSelectedOptionIds = question.options
          .map((opt) => opt.id)
          .filter((id) => selectedIds.includes(id));
        if (questionSelectedOptionIds.length > 0) {
          await this.service.voteMany(question.id, questionSelectedOptionIds);
          this.voted.update((ids) => [...ids, question.id]);
        }
      }
    } finally {
      this.isSubmitting.set(false);
      this.goBack();
    }
  }

  protected isVoted(poll: Poll): boolean {
    return this.voted().includes(poll.id);
  }

  protected isSurveyVoted(): boolean {
    const questions = this.surveyQuestions();
    return questions.length > 0 && questions.every((q) => this.isVoted(q));
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
