import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap, withLatestFrom } from 'rxjs/operators';
import { of } from 'rxjs';
import { Store } from '@ngrx/store';
import { ResourcesActionTypes } from './resources.actions';
import { ResourcesService } from '../services/resources.service';
import { Resource } from '../models/resource';

@Injectable({ providedIn: 'root' })
export class ResourcesEffects {

  @Effect()
  ResourcesLoadEffect$ = this.actions$.pipe(
    ofType(ResourcesActionTypes.LoadResources),
    withLatestFrom(this.store, (action: any, state) => ({ action, state })),
    switchMap(({ action, state }) =>
      this.resourcesService.getResources(state.settingsNode.api.watchdog + '/resources/tezedge')
        .pipe(
          map((resources: Resource[]) => ({ type: ResourcesActionTypes.ResourcesLoadSuccess, payload: resources })),
          catchError(error => of({ type: ResourcesActionTypes.ResourcesLoadError, payload: error })),
        )
    )
  );

  constructor(private resourcesService: ResourcesService,
              private actions$: Actions,
              private store: Store<any>) { }
}
