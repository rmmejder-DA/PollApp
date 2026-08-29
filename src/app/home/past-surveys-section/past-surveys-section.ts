import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Poll } from '../../core/services/poll.service';

@Component({
  selector: 'app-past-surveys-section',
  host: { id: 'past-surveys-section' },
  imports: [RouterLink],
  templateUrl: './past-surveys-section.html',
  styleUrl: './past-surveys-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class PastSurveysSection {
  @Input() polls: Poll[] = [];
  @Input() formatDate: (poll: Poll) => string = () => '';
}
