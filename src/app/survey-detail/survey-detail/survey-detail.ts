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
  protected readonly isResultsOpen = signal(true);

  protected readonly poll = computed(() => {
    const categoryParam = this.route.snapshot.paramMap.get('category');
    const questionIdParam = this.route.snapshot.paramMap.get('questionId');
    const legacyIdParam = this.route.snapshot.paramMap.get('id');
    if (questionIdParam) return this.findByQuestionId(questionIdParam);
    if (legacyIdParam) return this.findByLegacyId(legacyIdParam);
    if (categoryParam) return this.findByCategory(categoryParam);
    return null;
  });

  protected readonly surveyQuestions = computed(() => {
    const current = this.poll();
    if (!current) return [];
    const related = this.service.polls().filter(
      (item) => item.description === current.description && item.category === current.category,
    );
    return related.length > 0 ? related : [current];
  });

  /** Navigates back to the home page. */
  protected goBack(): void {
    this.router.navigate(['/']);
  }

  /** Opens the creation route. */
  protected goToCreate(): void {
    this.router.navigate(['/new-survey']);
  }

  /** Toggles the results visibility on small screens. */
  protected toggleResults(): void {
    this.isResultsOpen.update((isOpen) => !isOpen);
  }

  /** Toggles the selected state of one answer option. */
  protected toggleOption(poll: Poll, optionId: string): void {
    if (this.service.isPast(poll) || this.isVoted(poll) || this.isSubmitting()) return;
    this.selectedOptionIds.update((ids) => this.toggleSelection(ids, poll, optionId));
  }

  /** Returns whether a given option is selected. */
  protected isSelected(optionId: string): boolean {
    return this.selectedOptionIds().includes(optionId);
  }

  /** Submits all selected answers for the current survey. */
  protected async completeSurvey(mainPoll: Poll): Promise<void> {
    const selectedIds = this.selectedOptionIds();
    if (this.service.isPast(mainPoll) || this.isSubmitting()) return;
    this.isSubmitting.set(true);
    try {
      await this.submitSelectedQuestions(selectedIds);
    } catch (error) {
      console.error('Survey submission failed:', error);
    } finally {
      this.isSubmitting.set(false);
      this.goBack();
    }
  }

  /** Checks if a poll has already been voted on. */
  protected isVoted(poll: Poll): boolean {
    return this.voted().includes(poll.id);
  }

  /** Returns whether all current survey questions have been voted on. */
  protected isSurveyVoted(): boolean {
    const questions = this.surveyQuestions();
    return questions.length > 0 && questions.every((q) => this.isVoted(q));
  }

  /** Sums all votes for one poll. */
  protected total(poll: Poll): number {
    return poll.options.reduce((sum, option) => sum + option.votes, 0);
  }

  /** Returns a percent value clipped to 100. */
  protected percent(_poll: Poll, votes: number): number {
    return Math.min(100, votes);
  }

  /** Formats a date for display. */
  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  }

  /** Returns the current state label for a poll. */
  protected statusLabel(poll: Poll): string {
    return this.service.isPast(poll) ? 'Closed' : 'Published';
  }

  private findByQuestionId(questionId: string): Poll | null {
    return this.service.polls().find((item) => item.questionId === questionId) ?? null;
  }

  private findByLegacyId(id: string): Poll | null {
    return this.service.polls().find((item) => item.id === id) ?? null;
  }

  private findByCategory(category: string): Poll | null {
    return this.service.polls().find((item) => item.category.toLowerCase() === category.toLowerCase()) ?? null;
  }

  private toggleSelection(ids: string[], poll: Poll, optionId: string): string[] {
    if (ids.includes(optionId)) return ids.filter((id) => id !== optionId);
    if (poll.allowMultiple) return [...ids, optionId];
    const optionIds = new Set(poll.options.map((option) => option.id));
    return [...ids.filter((id) => !optionIds.has(id)), optionId];
  }

  private async submitSelectedQuestions(selectedIds: string[]): Promise<void> {
    const questions = this.surveyQuestions();
    for (const question of questions) {
      const ids = question.options.map((option) => option.id).filter((id) => selectedIds.includes(id));
      if (ids.length > 0) {
        await this.service.voteMany(question.id, ids);
        this.voted.update((value) => [...value, question.id]);
      }
    }
  }
}
