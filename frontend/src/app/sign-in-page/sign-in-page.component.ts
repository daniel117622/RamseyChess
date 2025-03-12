import { Component, OnInit } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-sign-in-page',
  templateUrl: './sign-in-page.component.html',
  styleUrls: ['./sign-in-page.component.css']
})
export class SignInPageComponent {
  constructor(
    public  auth  : AuthService,
    private http  : HttpClient,
    private router: Router
  ) {}

  // Method to log in the user
  login(): void 
  {
    this.auth.loginWithRedirect();

    this.auth.idTokenClaims$.pipe(take(1)).subscribe({
      next: (claims: any) => 
      {
        const sub = claims?.sub;
        if (sub) 
        {
          const body = { sub: sub };
          this.http.post('/api/register_login', body).subscribe({
            next: (response) => 
            {
              console.log('HTTP Request Successful', response);
              this.router.navigate(['/dashboard']);
            },
            error: (error) => 
            {
              console.error('HTTP Request Failed', error);
            }
          });
        }
      },
      error: (error) => 
      {
        console.error('Error retrieving ID token claims', error);
      }
    });
    
  }

  // Method to log out the user
  logout(): void {
    this.auth.logout({ logoutParams: { returnTo: window.location.origin } });
  }
}
