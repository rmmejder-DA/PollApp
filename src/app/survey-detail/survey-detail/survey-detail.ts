import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Poll, PollService } from '../../core/services/poll.service';
import { NotFoundPage } from '../../not-found/not-found/not-found';

@Component({
  selector: 'app-survey-detail',
  imports: [NotFoundPage],
  templateUrl: './survey-detail.html',
  styleUrl: './survey-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class SurveyDetail {
  private readonly votedStorageKey = 'pollapp-voted-polls';
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly service = inject(PollService);
  protected readonly voted = signal<string[]>(this.loadVotedPolls());
  protected readonly selectedOptionIds = signal<string[]>([]);
  protected readonly isSubmitting = signal(false);
  protected readonly isResultsOpen = signal(true);

  /** Resolves the route parameters against the polls currently loaded in memory. */
  protected readonly poll = computed(() => {
    const categoryParam = this.route.snapshot.paramMap.get('category');
    const questionIdParam = this.route.snapshot.paramMap.get('questionId');
    const legacyIdParam = this.route.snapshot.paramMap.get('id');
    if (questionIdParam) return this.findByQuestionId(questionIdParam);
    if (legacyIdParam) return this.findByLegacyId(legacyIdParam);
    if (categoryParam) return this.findByCategory(categoryParam);
    return null;
  });

  /** Groups all loaded questions belonging to the same displayed survey. */
  protected readonly surveyQuestions = computed(() => {
    const current = this.poll();
    if (!current) return [];
    const related = this.service.polls().filter(
      (item) => item.description === current.description && item.category === current.category,
    );
    return related.length > 0 ? related : [current];
  });

  /** Navigates back to the home page with the current category selected. */
  protected goBack(category?: string): void {
    this.router.navigate(['/'], { queryParams: category ? { category } : {} });
  }

  /** Opens the creation route. */
  protected goToCreate(): void {
    this.router.navigate(['/new-survey']);
  }

  /** Returns to the overview for completed surveys or submits a new response. */
  protected completeOrGoBack(poll: Poll): void {
    if (this.isSurveyVoted()) return this.goBack(poll.category);
    void this.completeSurvey(poll);
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
    if (this.isSurveyPast() || this.isSubmitting()) return;
    this.isSubmitting.set(true);
    try {
      await this.submitSelectedQuestions(selectedIds);
    } catch (error) {
      console.error('Survey submission failed:', error);
    } finally {
      this.isSubmitting.set(false);
      this.goBack(mainPoll.category);
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

  /** Returns whether the current survey has expired. */
  protected isSurveyPast(): boolean {
    return this.surveyQuestions().some((question) => this.service.isPast(question));
  }

  /** Sums all votes for one poll. */
  protected total(poll: Poll): number {
    return poll.options.reduce((sum, option) => sum + option.votes, 0);
  }

  /** Returns the percentage of votes for one answer option. */
  protected percent(poll: Poll, optionId: string, votes: number): number {
    const selectedIds = this.selectedOptionIds();
    const previewVotes = selectedIds.includes(optionId) ? 1 : 0;
    const totalVotes = this.total(poll) + selectedIds.filter((id) => poll.options.some((option) => option.id === id)).length;
    return totalVotes === 0 ? 0 : Math.round(((votes + previewVotes) / totalVotes) * 100);
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

  /** Finds the currently loaded poll by its stable question identifier. */
  private findByQuestionId(questionId: string): Poll | null {
    return this.service.polls().find((item) => item.questionId === questionId) ?? null;
  }

  /** Finds a poll by its legacy database identifier for old links. */
  private findByLegacyId(id: string): Poll | null {
    return this.service.polls().find((item) => item.id === id) ?? null;
  }

  /** Finds the first loaded poll matching a route category case-insensitively. */
  private findByCategory(category: string): Poll | null {
    return this.service.polls().find((item) => item.category.toLowerCase() === category.toLowerCase()) ?? null;
  }

  /** Applies single-choice or multiple-choice selection rules to one poll. */
  private toggleSelection(ids: string[], poll: Poll, optionId: string): string[] {
    if (ids.includes(optionId)) return ids.filter((id) => id !== optionId);
    if (poll.allowMultiple) return [...ids, optionId];
    const optionIds = new Set(poll.options.map((option) => option.id));
    return [...ids.filter((id) => !optionIds.has(id)), optionId];
  }

  /** Sends selected options for every related question and records successful votes. */
  private async submitSelectedQuestions(selectedIds: string[]): Promise<void> {
    const questions = this.surveyQuestions();
    for (const question of questions) {
      const ids = question.options.map((option) => option.id).filter((id) => selectedIds.includes(id));
      if (ids.length > 0) {
        const saved = await this.service.voteMany(question.id, ids);
        if (saved) this.markAsVoted(question.id);
      }
    }
  }

  /** Loads only this browser's completed poll ids without treating database votes as local votes. */
  private loadVotedPolls(): string[] {
    const stored = localStorage.getItem(this.votedStorageKey);
    if (!stored) return [];
    try {
      const value: unknown = JSON.parse(stored);
      return Array.isArray(value) && value.every((id) => typeof id === 'string') ? value : [];
    } catch {
      return [];
    }
  }

  /** Adds a successfully submitted poll to local state and persists it for the next visit. */
  private markAsVoted(pollId: string): void {
    this.voted.update((value) => value.includes(pollId) ? value : [...value, pollId]);
    localStorage.setItem(this.votedStorageKey, JSON.stringify(this.voted()));
  }
}
