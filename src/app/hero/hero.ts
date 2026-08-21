import { ChangeDetectionStrategy, Component, output } from '@angular/core';

@Component({
    selector: 'app-hero, app-api-image',
    host: { id: 'hero' },
    templateUrl: './hero.html',
    styleUrl: './hero.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Hero {
    readonly createSurvey = output<void>();
}


