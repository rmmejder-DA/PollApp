import { Injectable, OnDestroy, signal } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface PollOption {
  id: string;
  label: string;
  votes: number;
}

export interface Poll {
  id: string;
  questionId: string;
  title: string;
  description: string;
  category: string;
  endsAt: string;
  allowMultiple?: boolean;
  options: PollOption[];
}

export interface NewPoll {
  title: string;
  description: string;
  category: string;
  endsAt: string;
  allowMultiple?: boolean;
  options: string[];
}

type RawOption = { id: string; label: string; poll_votes: Array<{ id: string }> | null };
type RawPoll = {
  id: string;
  created_at: string;
  name: string | null;
  data: { category?: string; endsAt?: string; questionId?: string; allowMultiple?: boolean } | null;
  describing_text: string | null;
  answers: string[] | null;
  title: string;
  description: string;
  category: string;
  ends_at: string;
  poll_options: RawOption[] | null;
};

type DefaultQuestion = readonly [string, string, string, readonly string[]];

const defaultQuestions: readonly DefaultQuestion[] = [
  ['What should we do this weekend?', 'Collect ideas for the next group outing.', 'Leisure', ['Go hiking', 'Cook together', 'Movie night']],
  ['Which feature should come next?', 'Help the product team prioritize the next release.', 'Product', ['Share surveys', 'More analytics', 'New themes']],
  ['When should our community meet?', 'Find the best time for everyone.', 'Community', ['Monday, 6 PM', 'Wednesday, 7 PM', 'Friday, 5 PM']],
  ['Which color fits PollApp best?', 'Vote for the next brand color.', 'Product', ['Coral', 'Mint', 'Sunflower yellow']],
  ['How do you prefer to learn?', 'Share your preferred learning method.', 'Community', ['Videos', 'Practice exercises', 'Reading']],
];

@Injectable({ providedIn: 'root' })
export class PollService implements OnDestroy {
  readonly categories = ['All Surveys', 'Product', 'Community', 'Leisure', 'Team'];
  readonly polls = signal<Poll[]>([]);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  private readonly voteChannel: RealtimeChannel;

  /** Creates the service, subscribes to live vote changes, and starts the initial load. */
  constructor() {
    this.voteChannel = supabase
      .channel('poll-votes-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, () => {
        void this.loadPolls();
      })
      .subscribe();
    void this.loadPolls();
  }

  /** Cleans up the live vote subscription on destroy. */
  ngOnDestroy(): void {
    void supabase.removeChannel(this.voteChannel);
  }

  /** Loads the current list of surveys from Supabase. */
  async loadPolls(): Promise<void> {
    this.isLoading.set(true);
    try {
      const result = await this.fetchPolls();
      if (result.error) return this.handleLoadError(result.error);
      await this.applyLoadedPolls(this.mapPolls(result.data));
    } catch (error) {
      this.error.set(this.describeError(error, 'Surveys could not be loaded.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Creates a new survey entry and stores its answer options. */
  async createPoll(newPoll: NewPoll): Promise<Poll | null> {
    const questionId = this.createQuestionId(newPoll.category);
    try {
      const poll = await this.insertPoll(newPoll, questionId);
      if (!poll) return this.failCreate();
      return await this.saveOptionsAndReturnPoll(newPoll, poll);
    } catch (error) {
      this.error.set(this.describeError(error, 'The survey could not be created.'));
      return null;
    }
  }

  /** Submits a single vote for one answer option. */
  async vote(pollId: string, optionId: string): Promise<boolean> {
    return this.voteMany(pollId, [optionId]);
  }

  /** Saves one or more vote selections for a poll. */
  async voteMany(pollId: string, optionIds: string[]): Promise<boolean> {
    try {
      const { error } = await this.insertVotes(pollId, optionIds);
      if (error) return this.handleVoteError(error);
      await this.loadPolls();
      return true;
    } catch (error) {
      return this.handleVoteError(error);
    }
  }

  /** Checks whether a survey has already expired. */
  isPast(poll: Poll): boolean {
    return new Date(poll.endsAt).getTime() < Date.now();
  }

  /** Queries polls with their options and associated vote rows, ordered by end date. */
  private fetchPolls() {
    return supabase
      .from('polls')
      .select('id, created_at, name, data, describing_text, answers, title, description, category, ends_at, poll_options(id, label, poll_votes(id))')
      .order('ends_at', { ascending: true });
  }

  /** Converts a loading failure into the user-facing service error state. */
  private handleLoadError(error: unknown): void {
    this.error.set(this.describeError(error, 'Surveys could not be loaded. Please check the Supabase schema.'));
  }

  /** Seeds fallback surveys when Supabase has no currently active survey. */
  private async applyLoadedPolls(polls: Poll[]): Promise<void> {
    if (this.shouldSeedDefaults(polls)) {
      await this.seedDefaultQuestions();
      return;
    }
    this.error.set(null);
    this.polls.set(polls);
  }

  /** Stores a vote failure and reports that the operation did not succeed. */
  private handleVoteError(error: unknown): false {
    this.error.set(this.describeError(error, 'Your vote could not be saved.'));
    return false;
  }

  /** Determines whether initial sample surveys must be inserted. */
  private shouldSeedDefaults(polls: Poll[]): boolean {
    return polls.length === 0 || !polls.some((poll) => !this.isPast(poll));
  }

  /** Converts the untyped Supabase response into the application's poll model. */
  private mapPolls(data: unknown): Poll[] {
    return (data as RawPoll[] | null ?? []).map((poll) => this.mapPoll(poll));
  }

  /** Selects a useful message from an unknown error value. */
  private describeError(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }
    if (typeof error === 'string' && error.trim()) {
      return error;
    }
    return fallback;
  }

  /** Inserts all configured sample surveys and refreshes the local signal. */
  private async seedDefaultQuestions(): Promise<void> {
    for (const question of defaultQuestions) {
      const poll = await this.insertDefaultPoll(question);
      if (poll) {
        await this.insertDefaultOptions(poll.id, question[3]);
      }
    }
    this.polls.set(await this.loadSeededPolls());
  }

  /** Inserts one sample survey and returns its generated database id. */
  private async insertDefaultPoll(question: DefaultQuestion): Promise<{ id: string } | null> {
    const endsAt = this.createDefaultEndDate();
    const [name, describingText, category, answers] = question;
    const { data, error } = await supabase
      .from('polls')
      .insert(this.defaultPollData(name, describingText, category, answers, endsAt))
      .select('id')
      .single();
    if (error || !data) return this.handleDefaultPollError(error);
    return data;
  }

  /** Builds the database row for a configured sample survey. */
  private defaultPollData(name: string, description: string, category: string, answers: readonly string[], endsAt: string) {
    return { name, data: { category, endsAt }, describing_text: description, answers,
      title: name, description, category, ends_at: endsAt };
  }

  /** Records an error raised while inserting a sample survey. */
  private handleDefaultPollError(error: unknown): null {
    this.error.set(this.describeError(error, 'Default surveys could not be created.'));
    return null;
  }

  /** Inserts the answer options belonging to one sample survey. */
  private async insertDefaultOptions(pollId: string, answers: readonly string[]): Promise<void> {
    const { error } = await supabase.from('poll_options').insert(
      answers.map((label) => ({ poll_id: pollId, label })),
    );
    if (error) {
      this.error.set(this.describeError(error, 'Default options could not be saved.'));
    }
  }

  /** Reloads all surveys after the initial sample data has been created. */
  private async loadSeededPolls(): Promise<Poll[]> {
    const { data } = await supabase
      .from('polls')
      .select('id, created_at, name, data, describing_text, answers, title, description, category, ends_at, poll_options(id, label, poll_votes(id))')
      .order('ends_at', { ascending: true });
    return this.mapPolls(data);
  }

  /** Inserts a user-created survey and returns its generated database id. */
  private async insertPoll(newPoll: NewPoll, questionId: string): Promise<{ id: string } | null> {
    const { data, error } = await supabase
      .from('polls')
      .insert(this.newPollData(newPoll, questionId))
      .select('id, created_at, name, data, describing_text, answers, title, description, category, ends_at')
      .single();
    if (error || !data) return this.failCreate();
    return data;
  }

  /** Builds the normalized database row for a user-created survey. */
  private newPollData(newPoll: NewPoll, questionId: string) {
    const title = newPoll.title.trim();
    const description = newPoll.description.trim();
    return { name: title, data: { category: newPoll.category, endsAt: newPoll.endsAt, questionId,
      allowMultiple: newPoll.allowMultiple ?? false }, describing_text: description,
      answers: newPoll.options.map((label) => label.trim()), title, description,
      category: newPoll.category, ends_at: newPoll.endsAt };
  }

  /** Saves answer options, reloads polls, and returns the created survey. */
  private async saveOptionsAndReturnPoll(newPoll: NewPoll, poll: { id: string }): Promise<Poll | null> {
    const { error } = await supabase.from('poll_options').insert(
      newPoll.options.map((label) => ({ poll_id: poll.id, label: label.trim() })),
    );
    if (error) {
      this.error.set(this.describeError(error, 'The answer options could not be saved.'));
      return null;
    }
    await this.loadPolls();
    return this.polls().find((item) => item.id === poll.id) ?? null;
  }

  /** Stores the standard creation error and returns the null failure value. */
  private failCreate(): null {
    this.error.set('The survey could not be created.');
    return null;
  }

  /** Creates one database row per selected answer option. */
  private insertVotes(pollId: string, optionIds: string[]) {
    return supabase.from('poll_votes').insert(
      optionIds.map((optionId) => ({ poll_id: pollId, option_id: optionId })),
    );
  }

  /** Maps one raw Supabase survey, including its normalized category and options. */
  private mapPoll(poll: RawPoll): Poll {
    const category = this.translateCategory(poll.data?.category ?? poll.category);
    return {
      id: poll.id,
      questionId: poll.data?.questionId ?? `${this.slugifyCategory(category)}-${poll.id.slice(0, 6)}`,
      title: poll.name ?? poll.title,
      description: poll.describing_text ?? poll.description,
      category,
      endsAt: poll.data?.endsAt ?? poll.ends_at,
      allowMultiple: poll.data?.allowMultiple ?? false,
      options: this.mapOptions(poll.poll_options),
    };
  }

  /** Converts raw option rows into options with their current vote counts. */
  private mapOptions(options: RawOption[] | null): PollOption[] {
    return (options ?? []).map((option) => ({
      id: option.id, label: option.label, votes: option.poll_votes?.length ?? 0,
    }));
  }

  /** Creates a stable, unique question id from a category and current timestamp. */
  private createQuestionId(category: string): string {
    const prefix = this.slugifyCategory(category);
    const stamp = Date.now().toString(36).slice(-6);
    const rand = Math.random().toString(36).slice(2, 5);
    return `${prefix}-${stamp}-${rand}`;
  }

  /** Creates the one-week expiration timestamp used by seeded surveys. */
  private createDefaultEndDate(): string {
    const endsAt = new Date(Date.now() + 7 * 86_400_000);
    return endsAt.toISOString();
  }

  /** Converts a category label into a URL- and id-safe lowercase slug. */
  private slugifyCategory(category: string): string {
    return category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'survey';
  }

  /** Translates legacy category labels while preserving already normalized values. */
  private translateCategory(category: string): string {
    return { Alle: 'All', Produkt: 'Product', Freizeit: 'Leisure' }[category] ?? category;
  }
}
