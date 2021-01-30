import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TezedgeLineChartComponent } from './charts/tezedge-line-chart/tezedge-line-chart.component';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { TezedgeChartsCircleSeriesComponent } from './charts/tezedge-charts-circle-series/tezedge-charts-circle-series.component';
import { FlexLayoutModule } from '@angular/flex-layout';


@NgModule({
  declarations: [
    TezedgeLineChartComponent,
    TezedgeChartsCircleSeriesComponent,
  ],
  imports: [
    CommonModule,
    NgxChartsModule,
    FlexLayoutModule,
  ],
  exports: [
    TezedgeLineChartComponent,
    FlexLayoutModule,
  ]
})
export class TezedgeSharedModule {}
