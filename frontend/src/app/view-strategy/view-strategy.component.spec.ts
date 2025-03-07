import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewStrategyComponent } from './view-strategy.component';

describe('ViewStrategyComponent', () => {
  let component: ViewStrategyComponent;
  let fixture: ComponentFixture<ViewStrategyComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ViewStrategyComponent]
    });
    fixture = TestBed.createComponent(ViewStrategyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
