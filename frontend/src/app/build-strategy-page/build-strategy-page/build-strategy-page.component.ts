import { Component } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-build-strategy-page',
  templateUrl: './build-strategy-page.component.html',
  styleUrls: ['./build-strategy-page.component.css']
})
export class BuildStrategyPageComponent
{
  user$ = this.auth.user$;
  sub: string = 'default_user';

  constructor (
    public auth: AuthService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit (): void
  {
    this.user$.subscribe((user) =>
    {
      if (user?.sub)
      {
        this.sub = user.sub;
      }
    });
  }

  navigateTo (route: 'introduction' | 'material' | 'overview'): void
  {
    this.router.navigate(['build-strategy', route]);
  }
}
