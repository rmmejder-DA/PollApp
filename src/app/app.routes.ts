import { Routes } from '@angular/router';
import { HomePage } from './home/home';
import { NewSurveyPage } from './new-survey/new-survey';
import { NotFoundPage } from './not-found/not-found';
import { SurveyDetail } from './survey-detail/survey-detail';

export const routes: Routes = [
  { path: '', component: HomePage },
  { path: 'survey/:category/:questionId', component: SurveyDetail },
  { path: 'survey/:category', component: SurveyDetail },
  { path: 'new-survey', component: NewSurveyPage },
  { path: '**', component: NotFoundPage },
];
