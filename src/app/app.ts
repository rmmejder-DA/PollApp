import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CreatePoll } from './create-poll/create-poll';
import { Header } from './header/header';
import { Hero } from './hero/hero';
import { Poll, PollService } from './poll.service';

@Component({
  selector: 'app-root',
  imports: [CreatePoll, Header, Hero, ReactiveFormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly service = inject(PollService);
  protected readonly category = signal('All');
  protected readonly selected = signal<Poll | null>(null);
  protected readonly showForm = signal(false);
  protected readonly voted = signal<string[]>([]);
  protected readonly filteredPolls = computed(() => this.service.polls().filter((poll) => this.category() === 'All' || poll.category === this.category()));
  protected readonly activePolls = computed(() => this.filteredPolls().filter((poll) => !this.service.isPast(poll)));
  protected readonly pastPolls = computed(() => this.filteredPolls().filter((poll) => this.service.isPast(poll)));
  protected readonly urgentPolls = computed(() => this.activePolls()
    .filter((poll) => this.daysLeft(poll) <= 7)
    .sort((first, second) => new Date(first.endsAt).getTime() - new Date(second.endsAt).getTime()));

  protected selectCategory(value: string): void { this.category.set(value); }
  protected open(poll: Poll): void { this.selected.set(poll); }
  protected close(): void { this.selected.set(null); }
  protected openForm(): void { this.showForm.set(true); }
  protected closeForm(): void { this.showForm.set(false); }

  protected created(poll: Poll): void { this.closeForm(); this.open(poll); }

  protected async vote(poll: Poll, optionId: string): Promise<void> {
    if (this.service.isPast(poll) || this.voted().includes(poll.id)) return;
    if (await this.service.vote(poll.id, optionId)) this.voted.update((ids) => [...ids, poll.id]);
  }

  protected isVoted(poll: Poll): boolean { return this.voted().includes(poll.id); }
  protected total(poll: Poll): number { return poll.options.reduce((sum, option) => sum + option.votes, 0); }
  protected percent(poll: Poll, votes: number): number { return this.total(poll) ? Math.round(votes / this.total(poll) * 100) : 0; }
  protected daysLeft(poll: Poll): number { return Math.ceil((new Date(poll.endsAt).getTime() - Date.now()) / 86_400_000); }
  protected date(poll: Poll): string { return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' }).format(new Date(poll.endsAt)); }

}
