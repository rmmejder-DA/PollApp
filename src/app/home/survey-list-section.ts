import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Poll } from '../poll.service';

@Component({
  selector: 'app-survey-list-section',
  host: { id: 'survey-list-section' },
  imports: [RouterLink],
  templateUrl: './survey-list-section.html',
  styleUrl: './survey-list-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class SurveyListSection {
  @Input() polls: Poll[] = [];
  @Input() past = false;

  protected endLabel(poll: Poll): string {
    if (this.past) return 'Past survey';
    const days = Math.max(0, Math.ceil((new Date(poll.endsAt).getTime() - Date.now()) / 86_400_000));
    return `Ends in ${days} Day${days === 1 ? '' : 's'}`;
  }
}
