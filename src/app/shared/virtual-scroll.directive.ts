import {
    Directive, AfterViewInit, DoCheck, OnChanges, ViewRef,
    Input, Output, EventEmitter, ElementRef, ViewContainerRef,
    Renderer2, TemplateRef, SimpleChanges, OnDestroy, NgZone
} from '@angular/core';
import { of, fromEvent, Subject } from 'rxjs';
import { takeUntil, throttleTime } from 'rxjs/operators';
import * as fastdom from 'fastdom';

// tslint:disable-next-line: no-conflicting-lifecycle
@Directive({
    selector: '[vsFor][vsForOf]'
})
export class VirtualScrollDirective implements AfterViewInit, OnDestroy, OnChanges, DoCheck {

    private itemHeight = 32;
    private maxScrollHeight = 0;
    private scrollPositionStart = 0;
    private scrollPositionEnd = 0;

    private embeddedViews = [];

    private virtualScrollHeight = 0;

    public virtualScrollItemsCount = 0;
    public virtualScrollItemsOffset = 0;

    public prevScrollTop = 0;
    // private hoverTimer;
    // private scrollContainer;

    private viewportHeight = 0;
    private viewportScrollHeight = 0;

    private cacheRequestIds = {};
    private cacheItemsIds = new Set();
    private cacheItemsEntities = {};

    private $scroller: HTMLDivElement = document.createElement('div');
    private $viewport: HTMLElement;
    private scrollListener: () => void;

    public onDestroy$ = new Subject();

    @Input() vsForOf: any;

    @Output() getItems = new EventEmitter<any>();
    @Output() scrollChanged = new EventEmitter<any>();

    constructor(
        private element: ElementRef,
        private viewContainer: ViewContainerRef,
        private renderer: Renderer2,
        private template: TemplateRef<any>,
        private ngZone: NgZone) {
    }

    ngOnChanges(changes: SimpleChanges) {
        console.log('[ngOnChanges]', changes);
        
        if (this.virtualScrollItemsCount > 0) {
            // change offset if new item loaded (via live stream)
            if(changes.vsForOf.currentValue.lastCursorId != changes.vsForOf.previousValue.lastCursorId){
                this.virtualScrollItemsOffset = (this.vsForOf.lastCursorId - this.virtualScrollItemsCount);
            }
            this.renderViewportItems();
        }
    }

    ngDoCheck() {
        // console.log('[ngDoCheck]', this.vsForOf);
    }

    ngAfterViewInit() {
        // console.log('[ngAfterViewInit]');

        this.maxScrollHeight = this.getMaxBrowserScrollSize();

        this.$viewport = this.element.nativeElement.parentElement;
        this.$viewport.style.position = 'relative';
        this.$scroller.style.position = 'absolute';
        this.$scroller.style.top = '0px';
        this.$scroller.style.width = '1px';

        this.renderer.appendChild(this.$viewport, this.$scroller);

        this.viewportHeight = this.$viewport.getBoundingClientRect().height;

        // we can attach the event with passive option
        // this.ngZone.runOutsideAngular(() => {
        //     document.addEventListener("mousewheel", this.onScroll.bind(this), { passive: true });
        // });

        this.scrollListener = this.renderer.listen(this.$viewport, 'scroll', this.onScroll.bind(this));

        // console.log('[ngAfterViewInit] this.maxScrollHeight=' + this.maxScrollHeight + ' this.viewportHeight=' + this.viewportHeight);
        
        // this.scrollContainer = this.element.nativeElement.parentElement;

    }

    scrollToBottom() {

        // load all virtual scroll date
        this.load();

        console.log('[scrollToBottom] this.virtualScrollItemsCount=' + this.virtualScrollItemsCount
            + ' this.itemHeight=' + this.itemHeight);

        // set scroll to latest item in list
        this.$viewport.scrollTop = this.virtualScrollItemsCount * this.itemHeight;
        this.prevScrollTop = 0;
    }


    onScroll() {        
        // update virtual scroll before next repaint
        // window.requestAnimationFrame(() => {
        // this.ngZone.runOutsideAngular(() => {
        requestAnimationFrame(() => {
            const currentScrollTop = this.$viewport.scrollTop;

            // trigger only if user scrolled vertically
            if(this.prevScrollTop != currentScrollTop){
                console.log('[onScroll]');

                // If scroll is not at the bottom (end) - emit scroll changed event
                // console.error(this.viewportScrollHeight - currentScrollTop > Math.ceil(this.viewportHeight), this.viewportScrollHeight - currentScrollTop, Math.ceil(this.viewportHeight) )
                if(this.viewportScrollHeight - currentScrollTop > Math.ceil(this.viewportHeight)){
                    this.scrollChanged.emit();
                }
                
                // console.log('[onScroll] currentScrollTop=' + currentScrollTop + ' this.viewportHeight=' + this.viewportHeight);

                // use currect scroll position to get start and end item index
                let start = Math.floor((currentScrollTop - this.viewportHeight) / this.itemHeight);
                let end = Math.ceil((currentScrollTop + (this.viewportHeight * 2)) / this.itemHeight);
                start = Math.max(0, start);
                end = Math.min(this.virtualScrollHeight / this.itemHeight, end);
                // console.log('[onScroll] start=' + start + ' end=' + end
                    // + ' this.scrollPositionStart=' + this.scrollPositionStart + ' this.scrollPositionEnd=' + this.scrollPositionEnd);
    
                // get offset so we can set correct possition for items
                this.virtualScrollItemsOffset = (this.vsForOf.lastCursorId - this.virtualScrollItemsCount);
                // console.log('[onScroll] this.virtualScrollItemsCount=' + this.virtualScrollItemsCount
                    // + ' this.vsForOf.lastCursorId=' + this.vsForOf.lastCursorId);
    
    
                // check if we have new scroll event
                // if (this.scrollPositionStart !== start && this.scrollPositionEnd !== end) {
        
                    // save scroll position
                    this.scrollPositionStart = start;
                    this.scrollPositionEnd = end;
        
                    // get request postion
                    const requestPositionOffset = this.getRequestPositionOffset();

                    // if current request position not in cached positions
                    if(!this.cacheRequestIds.hasOwnProperty(requestPositionOffset)){

                        // render blank rows in correct position while data loading
                        // this.renderBlankViewportItems();

                        console.log('[onScroll] emit getItems');
                        // emit event to load data
                        this.getItems.emit({
                            start: this.virtualScrollItemsOffset + this.scrollPositionStart,
                            end: this.virtualScrollItemsOffset + this.scrollPositionEnd
                        });
                    }

                    // // disable hover events while scrolling to improve performance
                    // clearTimeout(this.hoverTimer);
                    // if(!this.vsForOf.stream && this.scrollContainer){
                    //     if(!this.scrollContainer.classList.contains('disable-hover')){
                    //         this.renderer.addClass(this.scrollContainer, 'disable-hover');
                    //     }
                    //     this.hoverTimer = setTimeout(() => {
                    //         this.renderer.removeClass(this.scrollContainer, 'disable-hover');
                    //     }, 300);
                    // }

                    // render items
                    this.renderViewportItems();
        
                // }
    
                this.prevScrollTop = currentScrollTop;
            }
        });

        // })
        // });

    }

    private clear() {
        console.log('[clear]');

        // clear cache
        this.cacheRequestIds = {};
        this.cacheItemsIds = new Set();
        this.cacheItemsEntities = {};
        // this.viewContainer.clear();
    }

    private load() {
        console.log('[load]');

        // TODO: should we clear on load?
        this.clear();

        // set row height in virtual scroll
        console.log('[load] this.itemHeight=' + this.itemHeight);

        // get number of items in virtual scroll
        console.log('[load] vsForOf.lastCursorId=', this.vsForOf.lastCursorId);
        this.virtualScrollItemsCount = (this.vsForOf.lastCursorId * this.itemHeight) > this.maxScrollHeight
            ? Math.floor(this.maxScrollHeight / this.itemHeight) : this.vsForOf.lastCursorId;

        // set virtual scroll height in pixels
        this.virtualScrollHeight = this.virtualScrollItemsCount * this.itemHeight;
        this.maxScrollHeight = this.maxScrollHeight > this.virtualScrollHeight ? this.virtualScrollHeight : this.maxScrollHeight;
        this.$scroller.style.height = `${this.maxScrollHeight}px`;
        this.viewportScrollHeight = this.$viewport.scrollHeight;

        console.log('[load] this.virtualScrollHeight=' + this.virtualScrollHeight + ' this.maxScrollHeight=' + this.maxScrollHeight);

        // this.$viewport.dispatchEvent(new Event('scroll'));
    }

    private renderViewportItems() {
        // this.ngZone.runOutsideAngular(() => {
        // requestAnimationFrame(() => {

        console.warn('[renderViewportItems]');
        // TODO: move this from here into some init function (needs to be after scrollPositionStart and End are set)
        if(!this.viewContainer.length){
            // Initialize viewContainer with all need views (rows)
            console.warn(`[renderViewportItems] viewContainer init (${this.scrollPositionEnd - this.scrollPositionStart} views)`);
            for (let index = 0; index < (this.scrollPositionEnd - this.scrollPositionStart); index++) {
                const view = this.viewContainer.createEmbeddedView(this.template);
                this.embeddedViews.push(view);
            }
        }

        // console.warn('[renderViewportItems] this.vsForOf=', this.vsForOf.ids);
        console.log('[renderViewportItems]  this.scrollPositionStart=' + this.scrollPositionStart
            + ' this.scrollPositionEnd=' + this.scrollPositionEnd);


        // mark current scroll position as cached
        const requestPositionOffset = this.getRequestPositionOffset();
        this.cacheRequestIds[requestPositionOffset] = true;

        // // defined for fastdom (remove)
        // const embedViews = this.embeddedViews;
        // const iteHeight = this.itemHeight;
        // const scrollPosStart = this.scrollPositionStart;
        // const scrollPositionEnd = this.scrollPositionEnd;
        // const cacheItemEntities = this.cacheItemsEntities;

        // loop through embedded views and change their contents
        for (let index = 0; index < this.embeddedViews.length; index++) {
            const virutalScrollPosition = this.virtualScrollItemsOffset + index + this.scrollPositionStart;
            const ind = index;

            // cache value
            if (this.vsForOf.entities.hasOwnProperty(virutalScrollPosition) && !this.cacheItemsIds.has(virutalScrollPosition)) {
                this.cacheItemsEntities = {
                    ...this.cacheItemsEntities,
                    [virutalScrollPosition]: this.vsForOf.entities[virutalScrollPosition],
                };
                this.cacheItemsIds.add(virutalScrollPosition);
            }

            // If needed entity not present anywhere
            if(!this.vsForOf.entities.hasOwnProperty(virutalScrollPosition) && !this.cacheItemsIds.has(virutalScrollPosition)){
                // remove this position from cached positions
                const requestPositionOffset = this.getRequestPositionOffset();
                delete this.cacheRequestIds[requestPositionOffset];
            }

            // const view = this.viewContainer.createEmbeddedView(this.template);
            // const view = this.viewContainer.get(index);

            // change view content
            const view = this.embeddedViews[index];
            view.context.position = (index + this.scrollPositionStart) * this.itemHeight;
            view.context.start = this.scrollPositionStart;
            view.context.end = this.scrollPositionEnd;
            view.context.index = index + this.scrollPositionStart;
            view.context.$implicit = {
                index: virutalScrollPosition,
                // ...this.vsForOf.entities[virutalScrollPosition]
                ...this.cacheItemsEntities[virutalScrollPosition],
            };
            view.markForCheck();

            // fastdom.mutate(function() {
            //     //change view content
            //     console.log('MUTATE: ', ind + scrollPosStart);
            //     const view = embedViews[ind];
            //     view.context.position = (ind + scrollPosStart) * iteHeight;
            //     view.context.start = scrollPosStart;
            //     view.context.end = scrollPositionEnd;
            //     view.context.index = ind + scrollPosStart;
            //     view.context.$implicit = {
            //         index: virutalScrollPosition,
            //         // ...this.vsForOf.entities[virutalScrollPosition]
            //         ...cacheItemEntities[virutalScrollPosition],
            //     };
            //     view.markForCheck();
            // });
        }
        // })
        // });
    }

    // get useable scroll size, so we can stack multiple pages for very large list
    // https://stackoverflow.com/questions/34931732/height-limitations-for-browser-vertical-scroll-bar
    private getMaxBrowserScrollSize(): number {

        if (!this.maxScrollHeight) {

            const div = document.createElement('div');
            const style = div.style;
            style.position = 'absolute';
            style.top = '9999999999999999px';
            document.body.appendChild(div);
            const size = div.getBoundingClientRect().top;
            document.body.removeChild(div);
            console.log('[getMaxBrowserScrollSize] max number of items: ', Math.abs(Math.floor(size / this.itemHeight)));
            return Math.abs(Math.floor(size / 10));

        } else {
            return this.maxScrollHeight;
        }

    }

    getRequestPositionOffset(){
        return Math.round((this.virtualScrollItemsOffset + (this.scrollPositionStart)) / 20) * 20;
    }

    ngOnDestroy() {
        if (this.scrollListener) {
            this.scrollListener();
        }
        
        // close all observables
        this.onDestroy$.next();
        this.onDestroy$.complete();
    }
}
