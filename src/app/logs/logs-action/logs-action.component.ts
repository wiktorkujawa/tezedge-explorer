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
      type: 'LOGS_ACTION_LOAD',
    });

    // wait for data changes from redux
    this.store.select('logsAction')
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(data => {
        this.virtualScrollItems = data;
        this.changeDetector.markForCheck();
        
        console.log('[logsAction] data', data);
        console.error(this.logsActionlastCursorId, '<',  data.lastCursorId);
        if (this.logsActionlastCursorId < data.lastCursorId) {
            this.logsActionlastCursorId = data.lastCursorId;
          setTimeout(() => {
            this.vrFor.scrollToBottom();
          });
        }
  
        // show details for last item
        if(!this.logsActionItem && data?.ids.length){
          this.logsActionItem = data?.entities[data.entities.length-1];
          this.logsClickedItem = this.logsActionItem;
        }
      });
  }
  
  getItems($event) {
    console.warn('[logs-action][getItems]', $event);
    this.store.dispatch({
      type: 'LOGS_ACTION_LOAD',
      payload: {
        cursor_id: $event.end
      },
    });
  }


  // set clicked item
  clickedItem(item: any){    
    if(this.logsClickedItem?.id !== item.id) {
      this.logsClickedItem = item;
      this.logsActionItem = this.logsClickedItem;
      this.changeDetector.detectChanges();
    }
  }

  // set temporary select item on hover
  tableMouseEnter(item: any){
    this.logsActionItem = item;
    this.changeDetector.detectChanges();
  }

  // set clicked item again as selected on hover leave
  tableMouseLeave(){
    this.logsActionItem = this.logsClickedItem;
    this.changeDetector.detectChanges();
  }

  scrollToEnd() {
    this.vrFor.scrollToBottom();
  }


  ngOnDestroy() {

    // stop logs stream
    this.store.dispatch({
      type: 'LOGS_ACTION_STOP',
    });

    // close all observables
    this.onDestroy$.next();
    this.onDestroy$.complete();

  }

  
}
