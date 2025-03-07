import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditStrategyComponent } from './edit-strategy.component';

describe('EditStrategyComponent', () => {
  let component: EditStrategyComponent;
  let fixture: ComponentFixture<EditStrategyComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EditStrategyComponent]
    });
    fixture = TestBed.createComponent(EditStrategyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
