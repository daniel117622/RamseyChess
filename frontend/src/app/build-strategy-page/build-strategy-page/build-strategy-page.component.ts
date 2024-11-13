import { Component } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-build-strategy-page',
  templateUrl: './build-strategy-page.component.html',
  styleUrls: ['./build-strategy-page.component.css']
})
export class BuildStrategyPageComponent {
  user$ = this.auth.user$;
  fade_animation_time : number = 400;
  fadeClass: string = 'fade-in';
  sub: string = 'default_user';
  currentStep: number = 0;

  steps = 
  [
    { component: 'app-introduction', title: 'Introduction' },
    { component: 'app-material-form', title: 'Material Form' },
    { component: 'app-strategy-overview', title: 'Strategy Overview' }
  ];

  nextStep() 
  {
    if (this.currentStep < this.steps.length - 1) 
    {
        this.triggerFadeOut(() => {
        this.currentStep++;
        this.fadeClass = 'fade-in';
      });
    }
  }

  previousStep() 
  {
    if (this.currentStep > 0) 
    {
      this.triggerFadeOut(() => {
        this.currentStep--;
        this.fadeClass = 'fade-in';
      });
    }
  }

  constructor(public auth: AuthService, private http: HttpClient) {}

  ngOnInit(): void 
  {
    this.user$.subscribe((user) => {
      if (user?.sub) {
        this.sub = user.sub;
      }
    });
  }

  private triggerFadeOut(callback: () => void) 
  {
    this.fadeClass = 'fade-out';
    setTimeout(callback, this.fade_animation_time); // Wait for the fade-out animation to complete
    
  }
}