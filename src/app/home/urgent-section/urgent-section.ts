import { ChangeDetectionStrategy, Component, Input, signal } from '@angular/core';
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
  protected readonly isDragging = signal(false);
  private activePointerId: number | null = null;
  private dragStartX = 0;
  private dragStartScrollLeft = 0;
  private suppressCardClick = false;

  protected startDragging(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const cards = event.currentTarget as HTMLDivElement;
    this.activePointerId = event.pointerId;
    this.dragStartX = event.clientX;
    this.dragStartScrollLeft = cards.scrollLeft;
  }

  protected dragCards(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId) return;

    const cards = event.currentTarget as HTMLDivElement;
    const distance = event.clientX - this.dragStartX;
    if (!this.isDragging() && Math.abs(distance) > 4) {
      cards.setPointerCapture(event.pointerId);
      this.isDragging.set(true);
      this.suppressCardClick = true;
    }
    if (this.isDragging()) cards.scrollLeft = this.dragStartScrollLeft - distance;
  }

  protected stopDragging(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId) return;

    const cards = event.currentTarget as HTMLDivElement;
    if (cards.hasPointerCapture(event.pointerId)) cards.releasePointerCapture(event.pointerId);
    this.activePointerId = null;
    this.isDragging.set(false);
  }

  protected handleCardClick(event: MouseEvent): void {
    if (!this.suppressCardClick) return;

    event.preventDefault();
    this.suppressCardClick = false;
  }
}
