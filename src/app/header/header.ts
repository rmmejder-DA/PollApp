import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header implements OnInit {
  readonly imgPath = signal('/icon/Frame-dark.svg');
  readonly showCreateButton = signal(false);
  readonly showHeader = signal(true);

  constructor(private readonly router: Router) {}

  ngOnInit(): void {
    this.setFrame(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.setFrame(event.urlAfterRedirects));
  }

  private setFrame(url: string): void {
    const isHome = url === '/';
    this.showHeader.set(url !== '/new-survey');
    this.imgPath.set(isHome ? '/icon/Frame-dark.svg' : '/icon/Frame-ligth.svg');
    this.showCreateButton.set(!isHome);
    document.body.classList.toggle('survey-page', url !== '/');
  }
}