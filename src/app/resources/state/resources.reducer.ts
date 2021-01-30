import { Resource } from '../models/resource';
import { ResourcesActionTypes } from './resources.actions';


export interface ResourcesState {
  resources: Resource[];
}

const initialState: ResourcesState = {
  resources: []
};

export function reducer(state: ResourcesState = initialState, action): ResourcesState {
  switch (action.type) {
    case ResourcesActionTypes.ResourcesLoadSuccess: {
      return {
        resources: action.payload
      };
    }
    default:
      return state;
  }
}

