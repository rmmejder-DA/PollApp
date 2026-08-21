import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-hero, app-api-image',
    host: { id: 'hero' },
    templateUrl: './hero.html',
    styleUrl: './hero.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Hero {}


