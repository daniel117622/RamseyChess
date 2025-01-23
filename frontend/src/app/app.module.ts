import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NgxChessBoardModule } from 'ngx-chess-board';
import { AppRoutingModule } from './app-routing.module';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AuthModule } from '@auth0/auth0-angular'; // Import AuthModule

import { AppComponent } from './app.component';
import { MainpageComponent } from './sandbox-page/mainpage/mainpage.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { MatevalComponent } from './sandbox-page/mateval/mateval.component';
import { MinimaxComponent } from './sandbox-page/minimax/minimax.component';
import { BlogComponent } from './blog-page/blog.component';
import { NavMenuComponent } from './navmenu/navmenu.component';
import { PlayPageComponent } from './play-page/play-page.component';
import { PlayAiCardComponent } from './play-card-page/play-card.component';
import { PlayBotsPageComponent } from './play-bots-page/play-bots-page.component';
import { SignInPageComponent } from './sign-in-page/sign-in-page.component';
import { ProfilePageComponent } from './profile-page/profile-page/profile-page.component';
import { BuildStrategyPageComponent } from './build-strategy-page/build-strategy-page/build-strategy-page.component';
import { IntroductionComponent } from './build-strategy-page/introduction/introduction.component';
import { MaterialFormComponent } from './build-strategy-page/material-form/material-form.component';
import { StrategyOverviewComponent } from './build-strategy-page/strategy-overview/strategy-overview.component'
import { MatDialogModule } from '@angular/material/dialog';
import { ConfirmPopupComponent } from './build-strategy-page/confirm-popup/confirm-popup.component';
import { ResetPopupComponent } from './play-bots-page/reset-popup/reset-popup.component';
import { MyStrategyComponent } from './profile-page/my-strategy/my-strategy.component';
import { GameLobbyPageComponent } from './game-lobby-page/game-lobby-page.component';

@NgModule({
  declarations: [
    AppComponent,
    MainpageComponent,
    SidebarComponent,
    MatevalComponent,
    MinimaxComponent,
    BlogComponent,
    NavMenuComponent,
    PlayPageComponent,
    PlayAiCardComponent,
    PlayBotsPageComponent,
    SignInPageComponent,
    ProfilePageComponent,
    BuildStrategyPageComponent,
    IntroductionComponent,
    MaterialFormComponent,
    StrategyOverviewComponent,
    ConfirmPopupComponent,
    ResetPopupComponent,
    MyStrategyComponent,
    GameLobbyPageComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgxChessBoardModule.forRoot(),
    FormsModule,
    HttpClientModule,
    AuthModule.forRoot({
      domain: "dev-dgi1jxipu4ughgfm.us.auth0.com",
      clientId: "IwaYtwfLQeiKReXuAnYRQ5lEqTjMjV8A",
      authorizationParams: {
        redirect_uri: window.location.origin
      }
    }),
    MatDialogModule
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule { }
