import { NgModule } from '@angular/core';
import { RouterModule, Routes, ExtraOptions } from '@angular/router';
import { MainpageComponent } from './sandbox-page/mainpage/mainpage.component';
import { BlogComponent } from './blog-page/blog.component';
import { PlayPageComponent } from './play-page/play-page.component';
import { PlayAiCardComponent } from './play-card-page/play-card.component';
import { PlayBotsPageComponent } from './play-bots-page/play-bots-page.component';
import { SignInPageComponent } from './sign-in-page/sign-in-page.component';

const routerOptions: ExtraOptions = {
  anchorScrolling: 'enabled', 
  scrollPositionRestoration: 'enabled', 
};

const routes: Routes = [
  { path: '', redirectTo: 'mainpage', pathMatch: 'full' },
  { path: 'mainpage', component: MainpageComponent },
  { path: 'blog', component: BlogComponent },
  { path: 'play-ai', component: PlayPageComponent},
  { path: 'cards/:id', component: PlayAiCardComponent },
  { path: 'bot-vs-bot', component: PlayBotsPageComponent},
  { path: 'sign-in', component: SignInPageComponent}

];

@NgModule({
  imports: [RouterModule.forRoot(routes, routerOptions)], 
  exports: [RouterModule],
})
export class AppRoutingModule { }
