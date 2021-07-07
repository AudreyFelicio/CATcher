import { isDevMode, NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthModule } from './auth/auth.module';
import { PhaseBugReportingModule } from './phase-bug-reporting/phase-bug-reporting.module';
import { PhaseTeamResponseModule } from './phase-team-response/phase-team-response.module';
import { PhaseModerationModule } from './phase-moderation/phase-moderation.module';
import { AuthGuard } from './core/guards/auth.guard';
import { DevEnvGuard } from './core/guards/dev-env.guard';
import { PhaseTesterResponseModule } from './phase-tester-response/phase-tester-response.module';
import { LogViewComponent } from './log-view/log-view.component';

const routes: Routes = [
  { path: '', loadChildren: () => AuthModule},
  { path: 'phaseBugReporting', loadChildren: () => PhaseBugReportingModule, canLoad: [AuthGuard]},
  { path: 'phaseTeamResponse', loadChildren: () => PhaseTeamResponseModule, canLoad: [AuthGuard]},
  { path: 'phaseTesterResponse', loadChildren: () => PhaseTesterResponseModule, canLoad: [AuthGuard]},
  { path: 'phaseModeration', loadChildren: () => PhaseModerationModule, canLoad: [AuthGuard]},
  { path: 'logView', component: LogViewComponent, canActivate: [DevEnvGuard] },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
