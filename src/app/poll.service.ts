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
  title: string;
  description: string;
  category: string;
  endsAt: string;
  options: PollOption[];
}

export interface NewPoll {
  title: string;
  description: string;
  category: string;
  endsAt: string;
  options: string[];
}

type RawOption = { id: string; label: string; poll_votes: Array<{ id: string }> | null };
type RawPoll = { id: string; created_at: string; name: string | null; data: { category?: string; endsAt?: string } | null; describing_text: string | null; answers: string[] | null; title: string; description: string; category: string; ends_at: string; poll_options: RawOption[] | null };
const defaultQuestions = [
  ['What should we do this weekend?', 'Collect ideas for the next group outing.', 'Leisure', ['Go hiking', 'Cook together', 'Movie night']],
  ['Which feature should come next?', 'Help the product team prioritize the next release.', 'Product', ['Share surveys', 'More analytics', 'New themes']],
  ['When should our community meet?', 'Find the best time for everyone.', 'Community', ['Monday, 6 PM', 'Wednesday, 7 PM', 'Friday, 5 PM']],
  ['Which color fits PollApp best?', 'Vote for the next brand color.', 'Product', ['Coral', 'Mint', 'Sunflower yellow']],
  ['How do you prefer to learn?', 'Share your preferred learning method.', 'Community', ['Videos', 'Practice exercises', 'Reading']],
  ['What belongs on the home screen?', 'Prioritize the most important information.', 'Product', ['Active surveys', 'Results', 'Categories']],
  ['Which activity brings the team together?', 'Choose a shared team activity.', 'Team', ['Quiz night', 'Cooking class', 'Sports day']],
  ['What is your favorite drink?', 'A small survey for everyday life.', 'Leisure', ['Coffee', 'Tea', 'Lemonade']],
  ['Which app feature do you use most?', 'Help us understand the most useful features.', 'Product', ['Vote', 'Create', 'Filter']],
] as const;

@Injectable({ providedIn: 'root' })
export class PollService implements OnDestroy {
  readonly categories = ['All Surveys', 'Product', 'Community', 'Leisure', 'Team'];
  readonly polls = signal<Poll[]>([]);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  private readonly voteChannel: RealtimeChannel;

  constructor() {
    this.voteChannel = supabase
      .channel('poll-votes-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, () => {
        void this.loadPolls();
      })
      .subscribe();
    void this.loadPolls();
  }

  ngOnDestroy(): void {
    void supabase.removeChannel(this.voteChannel);
  }

  async loadPolls(): Promise<void> {
    this.isLoading.set(true);
    const { data, error } = await supabase
      .from('polls')
      .select('id, created_at, name, data, describing_text, answers, title, description, category, ends_at, poll_options(id, label, poll_votes(id))')
      .order('ends_at', { ascending: true });

    if (error) {
      this.error.set('Surveys could not be loaded. Please check the Supabase schema.');
    } else {
      this.error.set(null);
      if (data.length === 0) {
        await this.seedDefaultQuestions();
        return;
      }
      this.polls.set((data as unknown as RawPoll[]).map((poll) => this.mapPoll(poll)));
    }
    this.isLoading.set(false);
  }

  async createPoll(newPoll: NewPoll): Promise<Poll | null> {
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .insert({
        name: newPoll.title.trim(),
        data: { category: newPoll.category, endsAt: newPoll.endsAt },
        describing_text: newPoll.description.trim(),
        answers: newPoll.options.map((label) => label.trim()),
        title: newPoll.title.trim(),
        description: newPoll.description.trim(),
        category: newPoll.category,
        ends_at: newPoll.endsAt,
      })
      .select('id, created_at, name, data, describing_text, answers, title, description, category, ends_at')
      .single();

    if (pollError || !poll) {
      this.error.set('The survey could not be created.');
      return null;
    }

    const { error: optionsError } = await supabase.from('poll_options').insert(
      newPoll.options.map((label) => ({ poll_id: poll.id, label: label.trim() })),
    );
    if (optionsError) {
      this.error.set('The answer options could not be saved.');
      return null;
    }

    await this.loadPolls();
    return this.polls().find((item) => item.id === poll.id) ?? null;
  }

  async vote(pollId: string, optionId: string): Promise<boolean> {
    return this.voteMany(pollId, [optionId]);
  }

  async voteMany(pollId: string, optionIds: string[]): Promise<boolean> {
    const { error } = await supabase.from('poll_votes').insert(
      optionIds.map((optionId) => ({ poll_id: pollId, option_id: optionId })),
    );
    if (error) {
      this.error.set('Your vote could not be saved.');
      return false;
    }
    await this.loadPolls();
    return true;
  }

  isPast(poll: Poll): boolean {
    return new Date(poll.endsAt).getTime() < Date.now();
  }

  private async seedDefaultQuestions(): Promise<void> {
    const endsAt = new Date(Date.now() + 7 * 86_400_000);
    endsAt.setUTCHours(18, 0, 0, 0);
    const endDate = endsAt.toISOString();

    for (const [name, describingText, category, answers] of defaultQuestions) {
      const { data: poll, error } = await supabase.from('polls').insert({
        name,
        data: { category, endsAt: endDate },
        describing_text: describingText,
        answers,
        title: name,
        description: describingText,
        category,
        ends_at: endDate,
      }).select('id').single();
      if (error || !poll) continue;
      await supabase.from('poll_options').insert(answers.map((label) => ({ poll_id: poll.id, label })));
    }

    const { data } = await supabase.from('polls').select('id, created_at, name, data, describing_text, answers, title, description, category, ends_at, poll_options(id, label, poll_votes(id))').order('ends_at', { ascending: true });
    this.polls.set((data as unknown as RawPoll[] ?? []).map((poll) => this.mapPoll(poll)));
  }

  private mapPoll(poll: RawPoll): Poll {
    return {
      id: poll.id,
      title: poll.name ?? poll.title,
      description: poll.describing_text ?? poll.description,
      category: this.translateCategory(poll.data?.category ?? poll.category),
      endsAt: poll.data?.endsAt ?? poll.ends_at,
      options: (poll.poll_options ?? []).map((option) => ({
        id: option.id,
        label: option.label,
        votes: option.poll_votes?.length ?? 0,
      })),
    };
  }

  private translateCategory(category: string): string {
    return { Alle: 'All', Produkt: 'Product', Freizeit: 'Leisure' }[category] ?? category;
  }
}
