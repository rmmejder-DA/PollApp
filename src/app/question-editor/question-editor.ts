import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-question-editor',
  imports: [ReactiveFormsModule],
  templateUrl: './question-editor.html',
  styleUrl: './question-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionEditor {
  readonly question = input.required<FormGroup>();
  readonly answers = input.required<FormArray>();
  readonly questionNumber = input.required<number>();
  readonly canRemove = input.required<boolean>();
  readonly removeQuestion = output<void>();
  readonly addAnswer = output<void>();
  readonly removeAnswer = output<number>();

  protected letter(index: number): string { return String.fromCharCode(65 + index); }
}
