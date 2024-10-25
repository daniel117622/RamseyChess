import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-blog',
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.css']
})
export class BlogComponent implements OnInit {
  activeSection: string = 'section1';
  constructor(private route: ActivatedRoute, private router: Router) {}
  @HostListener('window:scroll', ['$event'])
  onWindowScroll() {
    const section1 = document.getElementById('section1')?.getBoundingClientRect();
    const section2 = document.getElementById('section2')?.getBoundingClientRect();
    const section3 = document.getElementById('section3')?.getBoundingClientRect();

    if (section1 && section1.top <= 0 && section1.bottom > 0) {
      this.activeSection = 'section1';
    } else if (section2 && section2.top <= 0 && section2.bottom > 0) {
      this.activeSection = 'section2';
    } else if (section3 && section3.top <= 0 && section3.bottom > 0) {
      this.activeSection = 'section3';
    }
  }

  ngOnInit(): void {
    // Subscribe to fragment changes
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        const fragment = this.route.snapshot.fragment;
        if (fragment) {
          this.activeSection = fragment;
        }
      });
  }

}