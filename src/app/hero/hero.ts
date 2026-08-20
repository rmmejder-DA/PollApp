import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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


