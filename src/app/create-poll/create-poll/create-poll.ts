import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { NewPoll, Poll, PollService } from '../../core/services/poll.service';

@Component({
  selector: 'app-create-poll',
  host: {
    '(document:click)': 'closeCategoriesOnOutsideClick($event)',
  },
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

  /** Returns the form array containing all editable survey questions. */
  protected get questions(): FormArray {
    return this.form.controls.questions;
  }

  /** Closes the creation dialog. */
  protected close(): void {
    this.closed.emit();
  }

  /** Clears one field in the form. */
  protected clearField(field: 'surveyName' | 'describingText' | 'endsAt'): void {
    this.form.controls[field].setValue('');
  }

  /** Toggles the category menu. */
  protected toggleCategories(): void {
    this.categoriesOpen.update((open) => !open);
  }

  /** Closes the category menu and validates an unselected category after an outside click. */
  protected closeCategoriesOnOutsideClick(event: MouseEvent): void {
    if (!this.categoriesOpen() || !(event.target instanceof Element) || event.target.closest('.category-field')) return;

    this.categoriesOpen.set(false);
    if (this.form.controls.category.invalid) this.form.controls.category.markAsTouched();
  }

  /** Stores the selected category. */
  protected selectCategory(category: string): void {
    this.form.controls.category.setValue(category);
    this.categoriesOpen.set(false);
  }

  /** Hides the publish confirmation state. */
  protected closePublished(): void {
    this.published.set(false);
  }

  /** Returns the category currently selected in the creation form. */
  protected get category(): string {
    return this.form.controls.category.value;
  }

  /** Appends another question block. */
  protected addQuestion(): void {
    this.questions.push(this.questionGroup());
  }

  /** Converts the index to a plate letter. */
  protected letter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  /** Removes a question if more than one remains. */
  protected removeQuestion(index: number): void {
    if (this.questions.length > 1) {
      this.questions.removeAt(index);
    }
  }

  /** Adds a new answer input to a specific question. */
  protected addAnswer(index: number): void {
    this.questionAnswers(index).push(this.answerControl());
  }

  /** Removes an answer or clears it if only two remain. */
  protected removeAnswer(questionIndex: number, answerIndex: number): void {
    const answers = this.questionAnswers(questionIndex);
    if (answers.length > 2) {
      answers.removeAt(answerIndex);
      return;
    }
    answers.at(answerIndex).setValue('');
  }

  /** Returns the answer group for one question. */
  protected questionAnswers(index: number): FormArray {
    return this.questions.at(index).get('answers') as FormArray;
  }

  /** Saves all entered questions as polls. */
  protected async save(): Promise<void> {
    if (this.isSaving() || this.form.invalid || this.hasInvalidQuestions()) {
      this.form.markAllAsTouched();
      return;
    }
    this.beginSave();
    try {
      this.publish(await this.persistQuestions());
    } catch (error) {
      this.saveError.set(this.describeError(error, 'The survey could not be saved.'));
    } finally {
      this.isSaving.set(false);
    }
  }

  /** Shows the success state and emits the first created poll after the notice. */
  private publish(firstPoll: Poll | null): void {
    if (!firstPoll) return;
    this.published.set(true);
    window.setTimeout(() => this.created.emit(firstPoll), 2000);
  }

  /** Clears the previous save error and marks the form as busy. */
  private beginSave(): void {
    this.saveError.set('');
    this.isSaving.set(true);
  }

  /** Checks every question for invalid answer controls. */
  private hasInvalidQuestions(): boolean {
    return this.questions.controls.some((question) => {
      const answers = this.questionAnswers(this.questions.controls.indexOf(question));
      return answers.invalid;
    });
  }

  /** Persists questions in order and returns the first created poll for navigation. */
  private async persistQuestions(): Promise<Poll | null> {
    const value = this.form.getRawValue();
    let firstPoll: Poll | null = null;
    for (const question of value.questions) {
      const poll = await this.createQuestionPoll(question, value);
      if (!poll) {
        this.saveError.set(this.service.error() ?? 'The survey could not be saved.');
        return null;
      }
      firstPoll ??= poll;
    }
    return firstPoll;
  }

  /** Converts one form question into the service's poll input model. */
  private async createQuestionPoll(question: { name: string; allowMultiple: boolean; answers: string[] }, value: { surveyName: string; describingText: string; category: string; endsAt: string }) {
    return this.service.createPoll({
      title: question.name,
      description: value.describingText || value.surveyName,
      category: value.category,
      endsAt: value.endsAt ? new Date(`${value.endsAt}T18:00:00`).toISOString() : this.defaultEndDate(),
      allowMultiple: question.allowMultiple,
      options: question.answers,
    } satisfies NewPoll);
  }

  /** Extracts a readable message from an unknown save error. */
  private describeError(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }
    if (typeof error === 'string' && error.trim()) {
      return error;
    }
    return fallback;
  }

  /** Creates a validated form group containing one question and two answers. */
  private questionGroup() {
    return this.formBuilder.nonNullable.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      allowMultiple: [false],
      answers: this.formBuilder.array([this.answerControl(), this.answerControl()]),
    });
  }

  /** Creates a required, non-nullable answer input control. */
  private answerControl() {
    return this.formBuilder.nonNullable.control('', Validators.required);
  }

  /** Calculates the default expiration date for newly created surveys. */
  private defaultEndDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    date.setHours(18, 0, 0, 0);
    return date.toISOString();
  }

  /** Rejects empty dates and dates that are today or earlier. */
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

  /** Formats tomorrow as the minimum value accepted by the date input. */
  private getTomorrowStr(): string {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
