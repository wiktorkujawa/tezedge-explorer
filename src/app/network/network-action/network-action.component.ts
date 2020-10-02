import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Router, ActivatedRoute, Params } from '@angular/router';
import * as moment from 'moment-mini-ts';

import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { VirtualScrollDirective } from 'src/app/shared/virtual-scroll.directive';

@Component({
  selector: 'app-network-action',
  templateUrl: './network-action.component.html',
  styleUrls: ['./network-action.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NetworkActionComponent implements OnInit {

  // public networkAction;
  // public networkActionList = [];
  // public networkActionShow;
  public networkActionItem;
  public networkClickedItem;
  public networkActionlastCursorId = 0;
  public virtualScrollItems;

  public latestDateInView;
  public oldestDateInView;

  public onDestroy$ = new Subject();

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
          type: 'NETWORK_ACTION_START',
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
      // console.log('[networkAction]', this.networkActionlastCursorId, data.lastCursorId);
      if (this.networkActionlastCursorId < data.lastCursorId) {
        this.networkActionlastCursorId = data.lastCursorId;

        setTimeout(() => {
          this.vrFor.scrollToBottom();
        });

        // setTimeout(() => {
        //   this.viewPort.scrollTo({ bottom: 0 });
        // });

      }

      if(data && data.ids.length){
        const latestItem = data.entities[data.lastCursorId]
        if(latestItem){
          // show details for last item
          if(!this.networkClickedItem && !this.networkActionItem){
            this.networkActionItem = latestItem;
            this.networkClickedItem = latestItem;
          }
  
          if(!this.latestDateInView){
            // set latest date for pagination
            this.latestDateInView = moment.utc(Math.ceil(latestItem.timestamp / 1000000)).format('DD.MM.YYYY');
          }
          if(!this.oldestDateInView){
            // get oldest date for pagination
            if(data.oldestItemInView){
              this.oldestDateInView = moment.utc(Math.ceil(data.oldestItemInView.timestamp / 1000000)).format('DD.MM.YYYY')
            } else {       
              // dispatch action to get oldest item
              if(this.vrFor.lastItemInView){
                this.store.dispatch({
                  type: 'NETWORK_ACTION_GET_BY_ID',
                  payload: {
                    cursor_id: this.vrFor.lastItemInView
                  },
                });
              }
            }
          }
        }
      }
    });

    // // network action start
    // this.store.dispatch({
    //   type: 'NETWORK_ACTION_LOAD',
    //   payload: {},
    // });
  }

  getItems($event) {
    console.warn('[network-action][getItems]', $event, this.virtualScrollItems.stream);
    if (this.virtualScrollItems.stream) {
      this.store.dispatch({
        type: 'NETWORK_ACTION_START',
      });
    } else {
      this.store.dispatch({
        type: 'NETWORK_ACTION_LOAD',
        payload: {
          cursor_id: $event.end
        },
      });
    }
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

  // set clicked item
  clickedItem(item: any){    
    if(this.networkClickedItem?.id !== item.id) {
      this.networkClickedItem = {...item};
      this.networkActionItem = {...this.networkClickedItem};
    }
  }

  // set temporary select item on hover
  tableMouseEnter(item: any){
    this.networkActionItem = {...item};
  }

  // set clicked item again as selected on hover leave
  tableMouseLeave(){
    this.networkActionItem = {...this.networkClickedItem};
  }

  scrollToEnd() {
    console.log('[network-action][scrollToEnd]');
    this.vrFor.scrollToBottom();
    this.startStream();
  }

  onScroll() {
    // stop stream once user started scrolling
    if (this.virtualScrollItems.stream) {
      console.log('[network-action][onScroll]');
      this.stopStream();
    }
  }

  // manual stream toggle (live/paused)
  toggleStream(value:boolean){
    if(value === true){
      this.scrollToEnd();
      // this.startStream();
    } else {
      this.stopStream();
    }
  }

  startStream() {
    console.log('[network-action][startStream]');
    // triger action and get action data
    this.store.dispatch({
      type: 'NETWORK_ACTION_START'
    });
  }

  stopStream() {
    console.log('[network-action][stopStream]');
    // stop streaming actions
    this.store.dispatch({
      type: 'NETWORK_ACTION_STOP'
    });
  }

  // scrollToEnd() {
  //   const offset = this.ITEM_SIZE * this.networkActionList.length;
  //   this.viewPort.scrollToOffset(offset);
  // }

  ngOnDestroy() {
    console.log('[network-action][onDestroy]');

    // stop streaming actions
    this.store.dispatch({
      type: 'NETWORK_ACTION_STOP'
    });

    // close all observables
    this.onDestroy$.next();
    this.onDestroy$.complete();

  }
}
