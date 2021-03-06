import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NetworkPeersComponent } from './network-peers.component';

describe('NetworkPeersComponent', () => {
  let component: NetworkPeersComponent;
  let fixture: ComponentFixture<NetworkPeersComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NetworkPeersComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NetworkPeersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
