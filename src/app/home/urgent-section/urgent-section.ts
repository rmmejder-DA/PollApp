import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Poll } from '../../core/services/poll.service';

@Component({
  selector: 'app-urgent-section',
  host: { id: 'urgent-section' },
  imports: [RouterLink],
  templateUrl: './urgent-section.html',
  styleUrl: './urgent-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class UrgentSection {
  @Input() polls: Poll[] = [];
  @Input() daysLeft: (poll: Poll) => number = () => 0;
}
