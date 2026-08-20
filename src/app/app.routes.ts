import { Routes } from '@angular/router';
import { HomePage } from './home/home';
import { NewSurveyPage } from './new-survey/new-survey';
import { SurveyDetail } from './survey-detail/survey-detail';

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'survey/:id', component: SurveyDetail },
  { path: 'new-survey', component: NewSurveyPage },
  { path: '**', redirectTo: '' },
];
