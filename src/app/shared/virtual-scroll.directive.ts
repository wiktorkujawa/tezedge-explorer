import {
    Directive, AfterViewInit, DoCheck, OnChanges, ViewRef,
    IterableDiffer, Input, Output, EventEmitter, ElementRef, ViewContainerRef,
    Renderer2, TemplateRef, IterableDiffers, SimpleChanges, IterableChanges, OnDestroy
} from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';

// tslint:disable-next-line: no-conflicting-lifecycle
@Directive({
    selector: '[vsFor][vsForOf]'
})
export class VirtualScrollDirective implements AfterViewInit, OnDestroy, OnChanges, DoCheck {

    private itemHeight = 36;
    private maxScrollHeight = 0;

    private virtualScrollHeight = 0;
    private virtualScrollItemsCount = 0;

    private viewportHeight = 0;
    private cache = new Map<number, ViewRef>();

    private $scroller: HTMLDivElement = document.createElement('div');
    private $viewport: HTMLElement;
    private scrollListener: () => void;

    @Input() vsForOf: any;

    @Output() afterRender = new EventEmitter<any>();

    constructor(
        private element: ElementRef,
        private viewContainer: ViewContainerRef,
        private renderer: Renderer2,
        private template: TemplateRef<any>) {
    }

    ngOnChanges(changes: SimpleChanges) {
        // console.log('[ngOnChanges]', changes);
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
        this.scrollListener = this.renderer.listen(this.$viewport, 'scroll', this.onScroll.bind(this));
        // console.log('[ngAfterViewInit] this.maxScrollHeight=' + this.maxScrollHeight + ' this.viewportHeight=' + this.viewportHeight);

    }

    scrollToBottom() {

        // load all virtual scroll date
        this.load();

        console.log('[scrollToBottom] this.virtualScrollItemsCount=' + this.virtualScrollItemsCount
            + ' this.itemHeight=' + this.itemHeight);

        // set scroll to latest item in list
        this.$viewport.scrollTop = this.virtualScrollItemsCount * this.itemHeight;

    }


    onScroll() {

        window.requestAnimationFrame(() => {

            console.log('[onScroll] this.$viewport.scrollTop=' + this.$viewport.scrollTop + ' this.viewportHeight=' + this.viewportHeight);
            console.warn('[onScroll] itemsToEnd=', (this.maxScrollHeight - this.$viewport.scrollTop) / this.itemHeight);

            // render items
            this.renderViewportItems();

        });

    }

    private clear() {
        // console.log('[clear]');
        this.cache.clear();
        this.viewContainer.clear();
    }


    private load() {
        console.log('[load]');

        this.clear();

        const view = this.viewContainer.createEmbeddedView(this.template);
        view.context.position = 0;
        view.context.$implicit = { index: 0 };
        view.context.start = 0;
        view.context.end = 0;
        view.context.index = 0;
        view.detectChanges();

        // set row height in virtual scroll
        console.log('[load] this.itemHeight=' + this.itemHeight);
        this.itemHeight = 36;

        // get number of items in virtual scroll
        console.warn('[load] vsForOf.lastCursorId=', this.vsForOf);
        this.virtualScrollItemsCount = (this.vsForOf.lastCursorId * this.itemHeight) > this.maxScrollHeight
            ? Math.floor(this.maxScrollHeight / this.itemHeight) : this.vsForOf.lastCursorId;

        // set virtual scroll height in pixels
        this.virtualScrollHeight = this.virtualScrollItemsCount * this.itemHeight;

        console.log('[load] this.virtualScrollHeight=' + this.virtualScrollHeight + ' this.maxScrollHeight=' + this.maxScrollHeight);
        this.maxScrollHeight = this.maxScrollHeight > this.virtualScrollHeight ? this.virtualScrollHeight : this.maxScrollHeight;


        this.$scroller.style.height = `${this.maxScrollHeight}px`;
        view.destroy();

        this.$viewport.dispatchEvent(new Event('scroll'));

    }

    private renderViewportItems() {
        // console.log('[renderViewportItems] this.vsForOf=', this.vsForOf.entities);
        console.warn('[renderViewportItems] this.$viewport.scrollTop=' + this.$viewport.scrollTop);

        // use currect scroll posiotion to get start and end item index
        let start = Math.floor((this.$viewport.scrollTop - this.viewportHeight) / this.itemHeight);
        let end = Math.ceil((this.$viewport.scrollTop + (this.viewportHeight * 2)) / this.itemHeight);

        start = Math.max(0, start);
        end = Math.min(this.virtualScrollHeight / this.itemHeight, end);

        console.warn('[renderViewportItems] start=' + start + ' end=' + end);
        console.log('[renderViewportItems] this.virtualScrollHeight=' + this.virtualScrollHeight
            + ' this.viewportHeight=' + this.viewportHeight);

        this.cache.forEach((v, i) => {
            if (i < start || i > end) {
                v.destroy();
                this.cache.delete(i);
            }
        });

        // prepare items to render
        for (let index = 0; index < (end - start); index++) {
            if (!this.cache.get(index + start)) {

                const view = this.viewContainer.createEmbeddedView(this.template);
                // set item postion in scroller

                view.context.position = (index + start) * this.itemHeight;
                view.context.$implicit = { index: index + start, ...this.vsForOf.entities[index + start] };

                view.context.start = start;
                view.context.end = end;
                view.context.index = index + start;

                // this.cache.set(i + start, view);

                view.markForCheck();
            }

        }

        this.afterRender.emit({ start, end });

    }

    // get useable scroll size, so we can stack multiple pages for very large lists
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

    ngOnDestroy() {
        if (this.scrollListener) {
            this.scrollListener();
        }
    }
}
