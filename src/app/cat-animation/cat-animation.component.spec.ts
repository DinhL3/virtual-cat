import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CatAnimationComponent } from './cat-animation.component';

describe('CatAnimationComponent', () => {
  let component: CatAnimationComponent;
  let fixture: ComponentFixture<CatAnimationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CatAnimationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CatAnimationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
