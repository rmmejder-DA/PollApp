import { Injectable, signal } from '@angular/core';
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
  ['Was machen wir am Wochenende?', 'Sammelt Ideen für den nächsten gemeinsamen Ausflug.', 'Freizeit', ['Wandern gehen', 'Gemeinsam kochen', 'Filmabend']],
  ['Welches Feature kommt als Nächstes?', 'Hilf dem Produktteam bei der Priorisierung.', 'Produkt', ['Umfragen teilen', 'Mehr Statistiken', 'Neue Themes']],
  ['Wann passt unser Community-Treffen?', 'Finde den besten Termin für alle.', 'Community', ['Montag, 18 Uhr', 'Mittwoch, 19 Uhr', 'Freitag, 17 Uhr']],
  ['Welche Farbe passt zu PollApp?', 'Stimme für die nächste Markenfarbe ab.', 'Produkt', ['Koralle', 'Mint', 'Sonnenblumengelb']],
  ['Wie lernst du am liebsten?', 'Teile deine bevorzugte Lernmethode.', 'Community', ['Videos', 'Praxisübungen', 'Lesen']],
  ['Was gehört auf die Startseite?', 'Priorisiere die wichtigste Information.', 'Produkt', ['Aktive Umfragen', 'Ergebnisse', 'Kategorien']],
  ['Welche Aktivität bringt das Team zusammen?', 'Wähle eine gemeinsame Teamaktivität.', 'Team', ['Quizabend', 'Kochkurs', 'Sporttag']],
  ['Was ist dein Lieblingsgetränk?', 'Eine kleine Umfrage für den Alltag.', 'Freizeit', ['Kaffee', 'Tee', 'Limonade']],
  ['Welche App-Funktion nutzt du am häufigsten?', 'Hilf uns, Nutzungsschwerpunkte zu verstehen.', 'Produkt', ['Abstimmen', 'Erstellen', 'Filtern']],
  ['Wann soll der nächste Spieleabend stattfinden?', 'Finde einen passenden Termin.', 'Freizeit', ['Freitag', 'Samstag', 'Sonntag']],
] as const;

@Injectable({ providedIn: 'root' })
export class PollService {
  readonly categories = ['Alle', 'Produkt', 'Community', 'Freizeit', 'Team'];
  readonly polls = signal<Poll[]>([]);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    void this.loadPolls();
  }

  async loadPolls(): Promise<void> {
    this.isLoading.set(true);
    const { data, error } = await supabase
      .from('polls')
      .select('id, created_at, name, data, describing_text, answers, title, description, category, ends_at, poll_options(id, label, poll_votes(id))')
      .order('ends_at', { ascending: true });

    if (error) {
      this.error.set('Die Umfragen konnten nicht geladen werden. Bitte prüfe das Supabase-Schema.');
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
      this.error.set('Die Umfrage konnte nicht erstellt werden.');
      return null;
    }

    const { error: optionsError } = await supabase.from('poll_options').insert(
      newPoll.options.map((label) => ({ poll_id: poll.id, label: label.trim() })),
    );
    if (optionsError) {
      this.error.set('Die Antwortoptionen konnten nicht gespeichert werden.');
      return null;
    }

    await this.loadPolls();
    return this.polls().find((item) => item.id === poll.id) ?? null;
  }

  async vote(pollId: string, optionId: string): Promise<boolean> {
    const { error } = await supabase.from('poll_votes').insert({ poll_id: pollId, option_id: optionId });
    if (error) {
      this.error.set('Deine Stimme konnte nicht gespeichert werden.');
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
      category: poll.data?.category ?? poll.category,
      endsAt: poll.data?.endsAt ?? poll.ends_at,
      options: (poll.poll_options ?? []).map((option) => ({
        id: option.id,
        label: option.label,
        votes: option.poll_votes?.length ?? 0,
      })),
    };
  }
}
