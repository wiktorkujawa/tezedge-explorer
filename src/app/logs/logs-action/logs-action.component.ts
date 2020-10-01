import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';

import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { VirtualScrollDirective } from 'src/app/shared/virtual-scroll.directive';

@Component({
  selector: 'app-logs-action',
  templateUrl: './logs-action.component.html',
  styleUrls: ['./logs-action.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogsActionComponent implements OnInit, OnDestroy {
  public logsActionItem;
  public logsClickedItem;
  public logsActionlastCursorId = 0;
  public virtualScrollItems;

  public latestDateInView;
  public oldestDateInView;

  public onDestroy$ = new Subject();

  @ViewChild(CdkVirtualScrollViewport) viewPort: CdkVirtualScrollViewport;
  @ViewChild(VirtualScrollDirective) vrFor: VirtualScrollDirective;

  constructor(
    public store: Store<any>,
    private activeRoute: ActivatedRoute,
    private changeDetector: ChangeDetectorRef,
  ) { }

  ngOnInit() {

    // triger action and get logs data
    this.store.dispatch({
      type: 'LOGS_ACTION_START',
    });

    // wait for data changes from redux
    this.store.select('logsAction')
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(data => {
        this.virtualScrollItems = data;
        this.changeDetector.markForCheck();
        
        console.log('[logsAction] data', data);
        // console.error(this.logsActionlastCursorId, '<',  data.lastCursorId, `(${this.logsActionlastCursorId < data.lastCursorId})`);
        if (this.logsActionlastCursorId < data.lastCursorId) {
            this.logsActionlastCursorId = data.lastCursorId;
          setTimeout(() => {
            this.vrFor.scrollToBottom();
          });
        }
  
        if(data && data.ids.length){
          const latestItem = data.entities[data.lastCursorId]
          if(latestItem){
            // show details for last item
            if(!this.logsClickedItem && !this.logsActionItem){
              this.logsActionItem = latestItem;
              this.logsClickedItem = latestItem;
            }
    
            // set latest date for pagination
            console.log(latestItem.timestamp)
            console.log(latestItem.datetime)
            this.latestDateInView = latestItem.datetime;
          }
        }
      });
  }
  
  getItems($event) {
    console.warn('[logs-action][getItems]', $event, this.virtualScrollItems.stream);
    if (this.virtualScrollItems.stream) {
      this.store.dispatch({
        type: 'LOGS_ACTION_START',
      });
    } else {
      this.store.dispatch({
        type: 'LOGS_ACTION_LOAD',
        payload: {
          cursor_id: $event.end
        },
      });
    }
  }


  // set clicked item
  clickedItem(item: any){    
    if(this.logsClickedItem?.id !== item.id) {
      this.logsClickedItem = {...item};
      this.logsActionItem = {...this.logsClickedItem};
    }
  }

  // set temporary select item on hover
  tableMouseEnter(item: any){
    this.logsActionItem = {...item};
  }

  // set clicked item again as selected on hover leave
  tableMouseLeave(){
    this.logsActionItem = {...this.logsClickedItem};
  }

  scrollToEnd() {
    console.log('[logs-action][scrollToEnd]');
    this.vrFor.scrollToBottom();
    this.startStream();
  }

  onScroll() {
    // stop stream once user started scrolling
    if (this.virtualScrollItems.stream) {
      console.log('[logs-action][onScroll]');
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
    console.log('[logs-action][startStream]');
    // triger action and get action data
    this.store.dispatch({
      type: 'LOGS_ACTION_START'
    });
  }

  stopStream() {
    console.log('[logs-action][stopStream]');
    // stop streaming actions
    this.store.dispatch({
      type: 'LOGS_ACTION_STOP'
    });
  }

  ngOnDestroy() {
    console.log('[logs-action][ngOnDestroy]');
    // stop logs stream
    this.store.dispatch({
      type: 'LOGS_ACTION_STOP',
    });

    // close all observables
    this.onDestroy$.next();
    this.onDestroy$.complete();

  }

  
}
