import {
    Directive, AfterViewInit, DoCheck, OnChanges, ViewRef,
    IterableDiffer, Input, Output, EventEmitter, ElementRef, ViewContainerRef,
    Renderer2, TemplateRef, IterableDiffers, SimpleChanges, IterableChanges, OnDestroy
} from '@angular/core';
import { NgForOfContext } from '@angular/common';

// tslint:disable-next-line: no-conflicting-lifecycle
@Directive({
    selector: '[vsFor][vsForOf]'
})
export class VirtualScrollDirective implements AfterViewInit, DoCheck, OnChanges, OnDestroy {
    private itemSize = 0;
    private realScrollSize = 0;
    private currPage = 0;
    private currPageOffset = 0;
    private prevScrollPos = 0;
    private numPages = 0;
    private pageHeight = 0;
    private jumpCoefficient = 0;
    private virtualSize = 0;
    private viewportSize = 0;
    private cache = new Map<number, ViewRef>();
    private $scroller: HTMLDivElement = document.createElement('div');
    private $viewport: HTMLElement;
    private scrollListener: () => void;
    private differ: IterableDiffer<any[]> | null = null;
    private trackByFn: TrackByFunction<any[]>;

    @Input() vsForOf: any[];

    @Input()
    set vsForTrackBy(fn: TrackByFunction<any[]>) {
        this.trackByFn = fn;
    }
    get vsForTrackBy(): TrackByFunction<any[]> {
        return this.trackByFn;
    }

    @Output() afterRender = new EventEmitter<any>();

    constructor(
        private element: ElementRef,
        private viewContainer: ViewContainerRef,
        private renderer: Renderer2,
        private template: TemplateRef<any>,
        private differs: IterableDiffers) {
    }

    onScroll() {

        window.requestAnimationFrame(() => {
            console.log('[onScroll] this.$viewport.scrollTop=' + this.$viewport.scrollTop);

            const scrollPos = this.$viewport.scrollTop;

            // check if we are moving outside of viewport
            if (Math.abs(scrollPos - this.prevScrollPos) > this.viewportSize) {
                this.onScrollOutsideViewport();
            } else {
                this.onScrollInViewport();
            }

            // render items
            this.renderViewportItems();
        });

    }

    ngAfterViewInit() {
        console.log('[ngAfterViewInit]');

        this.realScrollSize = this.getMaxBrowserScrollSize();

        this.$viewport = this.element.nativeElement.parentElement;
        this.$viewport.style.position = 'relative';
        this.$scroller.style.position = 'absolute';
        this.$scroller.style.top = '0px';
        this.$scroller.style.width = '1px';

        this.renderer.appendChild(this.$viewport, this.$scroller);

        this.viewportSize = this.$viewport.getBoundingClientRect().height;
        this.scrollListener = this.renderer.listen(this.$viewport, 'scroll', this.onScroll.bind(this));

        console.log('[ngAfterViewInit] this.realScrollSize=' + this.realScrollSize  + ' this.viewportSize=' + this.viewportSize  );

    }

    ngOnChanges(changes: SimpleChanges): void {
        console.log('[ngOnChanges]', changes);

        if ('vsForOf' in changes) {
            // React on vsForOf changes only once all inputs have been initialized
            const value = changes.vsForOf.currentValue;
            if (!this.differ && value) {
                try {
                    this.differ = this.differs.find(value).create(this.vsForTrackBy);
                } catch (e) {
                    throw new Error(
                        `Cannot find a differ supporting object '${value}' of type '${JSON.stringify(value)}'. NgFor only supports binding to Iterables such as Arrays.`);
                }
            }
        }
    }

    // TODO: fix bug with scrolling item to 0
    scrollToItem(index: number) {
        console.log('[scrollTo] index=' + index + ' this.jumpCoefficient=' + this.jumpCoefficient);

        const virtualPos = index * this.itemSize;
        const currPage = /*this.currPage*/ Math.floor(virtualPos / this.pageHeight);
        const currPageOffset = /*this.currPageOffset*/ Math.round(currPage * this.jumpCoefficient);

        this.prevScrollPos = (virtualPos - currPageOffset);

        this.$viewport.scrollTop = this.prevScrollPos;
    }

    scrollToBottom() {

        console.log('[scrollToBottom] this.virtualSize=' + this.virtualSize );
        // this should not be working wee need to include also notion of page

        // this.load();

        this.$viewport.scrollTop = this.virtualSize;
        // this.$viewport.scrollTop = 0;

    }

    ngDoCheck(): void {
        console.log('[ngDoCheck]', this.differ);

        if (this.differ) {
            const changes = this.differ.diff(this.vsForOf);
            if (changes) {
                this.load();
            }
        }
    }

    private onScrollInViewport() {

        const scrollPos = this.$viewport.scrollTop;

        if (scrollPos + this.currPageOffset > (this.currPage + 1) * this.pageHeight) {

            this.currPage++;
            this.currPageOffset = Math.round(this.currPage * this.jumpCoefficient);
            this.$viewport.scrollTop = this.prevScrollPos = (scrollPos - this.jumpCoefficient);
            this.clear();

        } else if (scrollPos + this.currPageOffset < this.currPage * this.pageHeight) {

            this.currPage--;
            this.currPageOffset = Math.round(this.currPage * this.jumpCoefficient);
            this.$viewport.scrollTop = this.prevScrollPos = (scrollPos + this.jumpCoefficient);
            this.clear();

        } else {

            this.prevScrollPos = scrollPos;

        }

        console.log('+[onScrollInViewport] this.currPage=' + this.currPage + ' this.currPageOffset=' + this.prevScrollPos );

    }

    private onScrollOutsideViewport() {

        const scrollPos = this.$viewport.scrollTop;
        this.currPage = Math.floor(
            scrollPos * ((this.virtualSize - this.viewportSize) / (this.realScrollSize - this.viewportSize)) * (1 / this.pageHeight)
        );
        this.currPageOffset = Math.round(this.currPage * this.jumpCoefficient);
        this.prevScrollPos = scrollPos;
        this.clear();

        console.log('-[onScrollOutsideViewport] this.currPage=' + this.currPage + ' this.currPageOffset=' + this.prevScrollPos );
    }


    private clear() {
        console.log('[clear]');
        this.cache.clear();
        this.viewContainer.clear();
    }

    private load() {
        console.log('[load]');

        this.clear();

        const view = this.viewContainer.createEmbeddedView(this.template);
        view.context.__position__ = 0;
        view.context.$implicit = this.vsForOf[0];
        view.context.start = 0;
        view.context.end = 0;
        view.context.index = 0;
        view.detectChanges();
        const rect = getComputedStyle(this.$viewport.firstElementChild);

        console.log('[load] this.itemSize=' + this.itemSize);
        console.log('[load] rect.width=' + rect.width + ' rect.height=' + rect.width);

        // this.itemSize = parseFloat(rect.height) + (parseFloat(rect.marginTop) + parseFloat(rect.marginBottom));
        this.itemSize = 36;
        console.log('[load] this.itemSize=' + this.itemSize);

        // !!! important
        // this.virtualSize = this.vsForOf.length * this.itemSize;
        this.virtualSize = 10000000000 * this.itemSize;

        console.log('[load] this.virtualSize=' + this.virtualSize);

        // !!! if numPages is over 100 we get empty space at end of scrolling area
        this.pageHeight = this.realScrollSize / 100;
        this.numPages = Math.ceil(this.virtualSize / this.pageHeight);
        console.log('[load] this.numPages=' + this.numPages);

        const coff = (this.virtualSize - this.realScrollSize) / (this.numPages - 1);
        this.jumpCoefficient = coff > 0 ? coff : 1;
        console.log('[load] this.jumpCoefficient=' + this.jumpCoefficient);

        this.realScrollSize = this.realScrollSize > this.virtualSize ? this.virtualSize : this.realScrollSize;
        this.currPage = 1;
        this.currPageOffset = 0;
        this.prevScrollPos = this.prevScrollPos >= 0 ? this.prevScrollPos : 0;

        this.$scroller.style.height = `${this.realScrollSize}px`;
        view.destroy();
        this.$viewport.dispatchEvent(new Event('scroll'));
    }

    private renderViewportItems() {
        console.log('[renderViewportItems]');

        const y = this.$viewport.scrollTop + this.currPageOffset;

        let start = Math.floor((y - this.viewportSize) / this.itemSize);
        let end = Math.ceil((y + (this.viewportSize * 2)) / this.itemSize);

        start = Math.max(0, start);
        end = Math.min(this.virtualSize / this.itemSize, end);

        console.warn('[renderViewportItems] start=' + start + ' end=' + end + ' y=' + y );
        console.log('[renderViewportItems] this.itemSize=' + this.itemSize + ' this.virtualSize=' + this.virtualSize
            + ' this.viewportSize=' + this.viewportSize);

        this.cache.forEach((v, i) => {
            if (i < start || i > end) {
                v.destroy();
                this.cache.delete(i);
            }
        });


        // prepare item to render
        // this.vsForOf.slice(start, end).forEach((item, i) => {
        for (let i = 0; i < (end - start); i++) {
            // console.log(i);
            if (!this.cache.get(i + start)) {

                const view = this.viewContainer.createEmbeddedView(this.template);
                view.context.__position__ = (i + start) * this.itemSize - this.currPageOffset;
                view.context.$implicit = { id: i + start };

                view.context.start = start;
                view.context.end = end;

                view.context.index = i + start;
                this.cache.set(i + start, view);
                view.markForCheck();

                // console.log('[renderViewportItems][hit]');
            } else {
                // console.warn('[renderViewportItems][cache]');
            }
        }

        // this.afterRender.emit({ items: this.vsForOf.slice(start, end) });

    }

    // get useable scroll size, so we can stack multiple pages for very large lists
    // https://stackoverflow.com/questions/34931732/height-limitations-for-browser-vertical-scroll-bar
    private getMaxBrowserScrollSize(): number {
        // !!! must be multiple of this.itemSize
        return 3600000;
        if (!this.realScrollSize) {

            const div = document.createElement('div');
            const style = div.style;
            style.position = 'absolute';
            style.left = '99999999999999px';
            style.top = '9999999999999999px';
            document.body.appendChild(div);
            const size = div.getBoundingClientRect().top;
            document.body.removeChild(div);

            return Math.abs(size);

        } else {

            return this.realScrollSize;
        }

    }

    ngOnDestroy() {
        if (this.scrollListener) {
            this.scrollListener();
        }
    }
}


export type TrackByFunction<T> = (index: number, item: T) => any;
