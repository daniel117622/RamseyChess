import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameDbComponent } from './game-db.component';

describe('GameDbComponent', () => {
  let component: GameDbComponent;
  let fixture: ComponentFixture<GameDbComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [GameDbComponent]
    });
    fixture = TestBed.createComponent(GameDbComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
