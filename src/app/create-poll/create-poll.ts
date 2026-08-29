import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { NewPoll, Poll, PollService } from '../core/services/poll.service';

@Component({
  selector: 'app-create-poll',
  imports: [ReactiveFormsModule],
  templateUrl: './create-poll.html',
  styleUrl: './create-poll.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreatePoll {
  private readonly formBuilder = inject(FormBuilder);
  protected readonly service = inject(PollService);
  protected readonly closed = output<void>();
  protected readonly created = output<Poll>();
  protected readonly savedMessage = signal('');
  protected readonly saveError = signal('');
  protected readonly isSaving = signal(false);
  protected readonly published = signal(false);
  protected readonly categories = this.service.categories.slice(1);
  protected readonly categoriesOpen = signal(false);
  protected readonly minDate = this.getTomorrowStr();
  protected readonly form = this.formBuilder.nonNullable.group({
    surveyName: ['', Validators.required],
    describingText: [''],
    endsAt: ['', [this.futureDateValidator]],
    category: ['', Validators.required],
    questions: this.formBuilder.array([this.questionGroup()]),
  });

  protected get questions(): FormArray { return this.form.controls.questions; }

  protected close(): void { this.closed.emit(); }
  protected clearField(field: 'surveyName' | 'describingText' | 'endsAt'): void {
    this.form.controls[field].setValue('');
  }
  protected toggleCategories(): void { this.categoriesOpen.update((open) => !open); }
  protected selectCategory(category: string): void {
    this.form.controls.category.setValue(category);
    this.categoriesOpen.set(false);
  }
  protected closePublished(): void { this.published.set(false); }
  protected get category(): string { return this.form.controls.category.value; }
  protected addQuestion(): void { this.questions.push(this.questionGroup()); }
  protected letter(index: number): string { return String.fromCharCode(65 + index); }
  protected removeQuestion(index: number): void { if (this.questions.length > 1) this.questions.removeAt(index); }
  protected addAnswer(index: number): void { this.questionAnswers(index).push(this.answerControl()); }
  protected removeAnswer(questionIndex: number, answerIndex: number): void {
    const answers = this.questionAnswers(questionIndex);
    if (answers.length > 2) {
      answers.removeAt(answerIndex);
    } else {
      answers.at(answerIndex).setValue('');
    }
  }
  protected questionAnswers(index: number): FormArray { return this.questions.at(index).get('answers') as FormArray; }

  protected async save(): Promise<void> {
    if (this.isSaving()) return;
    if (this.form.invalid || this.questions.controls.some((question) => this.questionAnswers(this.questions.controls.indexOf(question)).invalid)) {
      this.form.markAllAsTouched();
      return;
    }
    this.saveError.set('');
    this.isSaving.set(true);
    try {
      const value = this.form.getRawValue();
      let firstPoll: Poll | null = null;
      for (const question of value.questions) {
        const poll = await this.service.createPoll({
          title: question.name,
          description: value.describingText || value.surveyName,
          category: value.category,
          endsAt: value.endsAt ? new Date(`${value.endsAt}T18:00:00`).toISOString() : this.defaultEndDate(),
          allowMultiple: question.allowMultiple,
          options: question.answers,
        } satisfies NewPoll);
        if (!poll) {
          this.saveError.set(this.service.error() ?? 'The survey could not be saved.');
          return;
        }
        firstPoll ??= poll;
      }
      if (firstPoll) {
        this.published.set(true);
        window.setTimeout(() => this.created.emit(firstPoll!), 2000);
      }
    } finally {
      this.isSaving.set(false);
    }
  }

  private questionGroup() {
    return this.formBuilder.nonNullable.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      allowMultiple: [false],
      answers: this.formBuilder.array([this.answerControl(), this.answerControl()]),
    });
  }

  private answerControl() { return this.formBuilder.nonNullable.control('', Validators.required); }
  private defaultEndDate(): string { const date = new Date(); date.setDate(date.getDate() + 7); date.setHours(18, 0, 0, 0); return date.toISOString(); }

  private futureDateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const selected = new Date(`${control.value}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selected <= today) {
      return { futureDate: true };
    }
    return null;
  }

  private getTomorrowStr(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
