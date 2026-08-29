import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CreatePoll } from '../../create-poll/create-poll/create-poll';
import { Poll } from '../../core/services/poll.service';

@Component({
  selector: 'app-new-survey',
  imports: [CreatePoll],
  templateUrl: './new-survey.html',
  styleUrl: './new-survey.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class NewSurveyPage {
  private readonly router = inject(Router);

  protected goBack(): void {
    this.router.navigate(['/']);
  }

  protected created(_poll: Poll): void {
    this.router.navigate(['/']);
  }
}
