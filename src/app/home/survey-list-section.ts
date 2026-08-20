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
  @Input() formatDate: (poll: Poll) => string = () => '';
  @Input() totalVotes: (poll: Poll) => number = () => 0;
}
