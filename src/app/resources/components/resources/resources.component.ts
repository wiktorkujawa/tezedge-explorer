import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { curveCardinal, CurveCardinalFactory } from 'd3-shape';
import { select, Store } from '@ngrx/store';
import { Resource } from '../../models/resource';
import { Observable } from 'rxjs';
import { ResourcesActionTypes } from '../../state/resources.actions';
import { filter, map } from 'rxjs/operators';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';


class ChartData {
  cpu: Array<{
    name: string;
    series: Array<SeriesEntry>;
  }>;
  memory: Array<{
    name: string;
    series: Array<SeriesEntry>;
  }>;
  disk: Array<{
    name: string;
    series: Array<SeriesEntry>;
  }>;
}

class SeriesEntry {
  name: string;
  value: number;
}

@UntilDestroy()
@Component({
  selector: 'app-resources',
  templateUrl: './resources.component.html',
  styleUrls: ['./resources.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResourcesComponent implements OnInit {

  chartData$: Observable<ChartData>;

  readonly curve: CurveCardinalFactory = curveCardinal;
  readonly colorScheme = {
    domain: ['#46afe3', '#df80ff', '#5aa454', '#ff6f00', '#ffe600', '#fa098d']
  };

  constructor(private store: Store<any>) {}

  ngOnInit(): void {
    this.chartData$ = this.store.pipe(
      untilDestroyed(this),
      select(state => state.resources.resources),
      filter((resources: Resource[]) => resources.length > 0),
      map((resources: Resource[]) => ResourcesComponent.createChartData(resources))
    );
    this.getResources();
  }

  private getResources(): void {
    this.store.dispatch({ type: ResourcesActionTypes.LoadResources });
  }

  private static createChartData(resources: Array<Resource>): ChartData {
    const chartData = new ChartData();
    chartData.memory = [];
    chartData.disk = [];
    chartData.cpu = [];

    chartData.memory.push({
      name: 'RAM',
      series: ResourcesComponent.getSeries(resources, 'memory.node.resident')
    });
    chartData.cpu.push({
      name: 'CPU',
      series: ResourcesComponent.getSeries(resources, 'cpu.node')
    });

    chartData.disk.push({
      name: 'DISK BLOCK STORAGE',
      series: ResourcesComponent.getSeries(resources, 'disk.blockStorage')
    });
    chartData.disk.push({
      name: 'DISK DEBUGGER',
      series: ResourcesComponent.getSeries(resources, 'disk.debugger')
    });
    chartData.disk.push({
      name: 'DISK CONTEXT IRMIN',
      series: ResourcesComponent.getSeries(resources, 'disk.contextIrmin')
    });

    if (resources[0].disk.mainDb) {
      chartData.disk.push({
        name: 'DISK MAIN DB',
        series: ResourcesComponent.getSeries(resources, 'disk.mainDb')
      });
    }
    if (resources[0].disk.contextMerkleRocksDb) {
      chartData.disk.push({
        name: 'DISK CONTEXT MERKLE ROCKS DB',
        series: ResourcesComponent.getSeries(resources, 'disk.contextMerkleRocksDb')
      });
    }
    if (resources[0].disk.contextActions) {
      chartData.disk.push({
        name: 'DISK CONTEXT ACTIONS',
        series: ResourcesComponent.getSeries(resources, 'disk.contextActions')
      });
    }

    return chartData;
  }

  private static getSeries(resources: Array<Resource>, pathToProperty: string): Array<SeriesEntry> {
    return resources.map(resource => ({
      name: resource.timestamp,
      value: ResourcesComponent.getValueFromNestedResourceProperty(resource, pathToProperty)
    })).reverse();
  }

  private static getValueFromNestedResourceProperty(resource: Resource, pathToProperty: string): number {
    return pathToProperty.split('.').reduce((obj: Resource, property: string) => obj[property], resource);
  }
}
