import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectionStrategy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject, Observable, Subscription } from 'rxjs';
import { takeUntil, map, debounceTime, filter } from 'rxjs/operators';
import { CollectionViewer, DataSource } from '@angular/cdk/collections';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { VirtualScrollDirective } from '../../shared/virtual-scroll.directive';

@Component({
  selector: 'app-mempool-action',
  templateUrl: './mempool-action.component.html',
  styleUrls: ['./mempool-action.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MempoolActionComponent implements OnInit, OnDestroy {

  public mempoolAction;
  public mempoolActionList = [];

  public networkAction;
  public networkActionList = [];
  public networkActionItem;

  public onDestroy$ = new Subject();

  public networkAction$;
  public networkDataSource;
  public networkActionlastCursorId = 0;

  public virtualScrollItems = [];

  @ViewChild(CdkVirtualScrollViewport) viewPort: CdkVirtualScrollViewport;

  @ViewChild(VirtualScrollDirective) vrFor: VirtualScrollDirective;

  constructor(
    public store: Store<any>,
    private changeDetector: ChangeDetectorRef
  ) { }

  ngOnInit(): void {

    // triger action and get mempool data
    this.store.dispatch({
      type: 'MEMPOOL_ACTION_LOAD',
    });

    // wait for data changes from redux
    this.store.select('mempoolAction')
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(data => {
        this.mempoolAction = data;
      });

    // wait for data changes from redux
    this.store.select('networkAction')
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(data => {

        this.virtualScrollItems = data;
        this.changeDetector.markForCheck();

        // console.log('[networkAction] data', data);
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

    // network action start
    this.store.dispatch({
      type: 'NETWORK_ACTION_LOAD',
      payload: {},
    });

    // create custom network data source
    this.networkAction$ = this.store.select('networkAction');
    this.networkDataSource = new NetworkDataSource(this.networkAction$, this.store);

  }

  getItems($event) {

    // console.warn('[mempool-action][getItems]', $event);

    this.store.dispatch({
      type: 'NETWORK_ACTION_LOAD',
      payload: {
        cursor_id: $event.end
      },
    });

  }

  scrollToItem() {
    this.vrFor.scrollToBottom();
  }

  scrollToBottom() {
    console.log('[scrollToBottom]');
    this.viewPort.scrollTo({ bottom: 0 });
  }

  tableMouseEnter(item) {
    // console.log('[tableMouseEnter]', item);
    this.networkActionItem = item;
  }

  ngOnDestroy() {

    // stop streaming actions
    this.store.dispatch({
      type: 'MEMPOOL_ACTION_STOP'
    });

    // close all observables
    this.onDestroy$.next();
    this.onDestroy$.complete();

  }

}


export class NetworkDataSource extends DataSource<any> {

  private subscription = new Subscription();
  private dataRange = { start: 0, end: 0 };

  public constructor(
    private networkAction$: Observable<any>,
    private store: Store<any>,
  ) {
    super();
  }

  connect(collectionViewer: CollectionViewer): Observable<(string | undefined)[]> {

    this.subscription.add(collectionViewer.viewChange
      .pipe(
        // debounceTime(50),
        filter(range => {
          return (range.end > this.dataRange.end) || (range.start < this.dataRange.start) ? true : false;
        })
      )
      .subscribe(virtualScrollRange => {
        // console.log('[NetworkDataSource][viewChange]', virtualScrollRange);

        this.store.dispatch({
          type: 'NETWORK_ACTION_LOAD',
          payload: {
            cursor_id: virtualScrollRange.end
          },
        });

      }));

    return this.networkAction$.pipe(
      filter(data => data.ids.length > 0),
      map(data => {

        // console.log('[NetworkDataSource] start');

        const dataView = new Array(data.lastCursorId);
        // data.ids.map(id => { dataView[id] = data.entities[id]; });

        this.dataRange = { start: data.ids[0], end: data.ids[data.ids.length - 1] };

        // console.log('[NetworkDataSource] dataView', dataView);

        return dataView;
      }),

    );
  }

  disconnect(): void {
    this.subscription.unsubscribe();
  }

}
