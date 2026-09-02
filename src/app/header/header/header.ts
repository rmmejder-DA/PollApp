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
  readonly isHome = signal(true);
  readonly isNewSurvey = signal(false);

  /** Creates the header with the router used to react to navigation changes. */
  constructor(private readonly router: Router) {}

  /** Initializes the current frame and subscribes to later route changes. */
  ngOnInit(): void {
    this.setFrame(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.setFrame(event.urlAfterRedirects));
  }

  /** Updates header visibility, logo, create action, and page-specific body styling. */
  private setFrame(url: string): void {
    const path = url.split('?')[0].replace(/\/$/, '');
    const isHome = path === '' || path === '/' || path.endsWith('/angular-project');
    const isNewSurvey = path.endsWith('/new-survey');
    this.isHome.set(isHome);
    this.isNewSurvey.set(isNewSurvey);
    this.showHeader.set(true);
    this.imgPath.set(isHome ? '/icon/Frame-dark.svg' : '/icon/Frame-ligth.svg');
    this.showCreateButton.set(!isHome && !isNewSurvey);
    document.body.classList.toggle('survey-page', url !== '/');
  }
}