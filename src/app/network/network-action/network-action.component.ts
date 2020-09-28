import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Router, ActivatedRoute, Params } from '@angular/router';

import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { VirtualScrollDirective } from 'src/app/shared/virtual-scroll.directive';

@Component({
  selector: 'app-network-action',
  templateUrl: './network-action.component.html',
  styleUrls: ['./network-action.component.scss']
})
export class NetworkActionComponent implements OnInit {

  public networkAction;
  public networkActionList = [];
  public networkActionShow;
  public networkActionItem;

  public networkActionlastCursorId = 0;
  public virtualScrollItems = [];

  public onDestroy$ = new Subject();

  public ITEM_SIZE = 36;

  @ViewChild(CdkVirtualScrollViewport) viewPort: CdkVirtualScrollViewport;
  @ViewChild(VirtualScrollDirective) vrFor: VirtualScrollDirective;

  constructor(
    public store: Store<any>,
    private activeRoute: ActivatedRoute,
    private router: Router,
    private changeDetector: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    this.activeRoute.params
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((params) => {

        // triger action and get network data
        this.store.dispatch({
          type: 'NETWORK_ACTION_LOAD',
          payload: {
            filter: params.address ? params.address : ''
          },
        });
      });

    // wait for data changes from redux
    this.store.select('networkAction')
    .pipe(takeUntil(this.onDestroy$))
    .subscribe(data => {

      this.virtualScrollItems = data;
      this.changeDetector.markForCheck();

      console.log('[networkAction] data', data);
      if (this.networkActionlastCursorId < data.lastCursorId) {

        // console.log('[networkAction]', this.networkActionlastCursorId, data.lastCursorId);
        this.networkActionlastCursorId = data.lastCursorId;

        setTimeout(() => {
          this.vrFor.scrollToBottom();
        });

        // setTimeout(() => {
        //   this.viewPort.scrollTo({ bottom: 0 });
        // });

      }
    });

    // // network action start
    // this.store.dispatch({
    //   type: 'NETWORK_ACTION_LOAD',
    //   payload: {},
    // });
  }

  getItems($event) {
    console.warn('[network-action][getItems]', $event);
    this.store.dispatch({
      type: 'NETWORK_ACTION_LOAD',
      payload: {
        cursor_id: $event.end
      },
    });
  }

  filterType(filterType) {
    // dispatch action
    this.store.dispatch({
      type: 'NETWORK_ACTION_FILTER',
      payload: filterType,
    });
  }

  filterAddress() {
    // remove address and route to default network url 
    this.router.navigate(['network'])
  }

  tableMouseEnter(item) {
    // console.log('[tableMouseEnter]', item);
    this.networkActionItem = item;
  }

  scrollToEnd() {
    this.vrFor.scrollToBottom();
  }

  // onScroll(index) {
  //   if (this.networkActionList.length - index > 15) {
  //     // stop log actions stream
  //     this.store.dispatch({
  //       type: 'NETWORK_ACTION_STOP',
  //       payload: event,
  //     });
  //   } else {
  //     // start log actions stream
  //     this.store.dispatch({
  //       type: 'NETWORK_ACTION_START',
  //       payload: event,
  //     });
  //   }
  // }

  // scrollStart() {
  //   // triger action and get action data
  //   this.store.dispatch({
  //     type: 'NETWORK_ACTION_START'
  //   });
  // }

  // scrollStop() {
  //   // stop streaming actions
  //   this.store.dispatch({
  //     type: 'NETWORK_ACTION_STOP'
  //   });
  // }

  // scrollToEnd() {
  //   const offset = this.ITEM_SIZE * this.networkActionList.length;
  //   this.viewPort.scrollToOffset(offset);
  // }

  ngOnDestroy() {

    // stop streaming actions
    this.store.dispatch({
      type: 'NETWORK_ACTION_STOP'
    });

    // close all observables
    this.onDestroy$.next();
    this.onDestroy$.complete();

  }
}
