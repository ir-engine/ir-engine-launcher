import { createState, useState } from '@speigg/hookstate'
import { Channels } from 'constants/Channels'
import { AppModel, DefaultAppsStatus, DefaultClusterStatus, DefaultSystemStatus } from 'models/AppStatus'

import { store, useDispatch } from '../store'

//State
const state = createState({
  appStatus: [] as AppModel[],
  clusterStatus: [] as AppModel[],
  systemStatus: [] as AppModel[]
})

store.receptors.push((action: DeploymentStatusActionType): void => {
  state.batch((s) => {
    switch (action.type) {
      case 'DEPLOYMENT_STATUS_FETCH':
        return s.merge({
          systemStatus: [...DefaultSystemStatus],
          appStatus: [...DefaultAppsStatus],
          clusterStatus: [...DefaultClusterStatus]
        })
      case 'SYSTEM_STATUS_RECEIVED': {
        const index = s.systemStatus.value.findIndex((app) => app.id === action.systemStatus.id)
        s.systemStatus.merge({ [index]: action.systemStatus })
        break
      }
      case 'APP_STATUS_RECEIVED': {
        const index = s.appStatus.value.findIndex((app) => app.id === action.appStatus.id)
        s.appStatus.merge({ [index]: action.appStatus })
        break
      }
      case 'CLUSTER_STATUS_RECEIVED': {
        const index = s.clusterStatus.value.findIndex((app) => app.id === action.clusterStatus.id)
        s.clusterStatus.merge({ [index]: action.clusterStatus })
        break
      }
    }
  }, action.type)
})

export const accessDeploymentStatusState = () => state

export const useDeploymentStatusState = () => useState(state) as any as typeof state

//Service
export const DeploymentStatusService = {
  fetchDeploymentStatus: async (sudoMode: boolean) => {
    const dispatch = useDispatch()
    try {
      dispatch(DeploymentStatusAction.fetchDeploymentStatus())
      window.electronAPI.invoke(Channels.Shell.CheckMinikubeConfig, sudoMode)
    } catch (error) {
      console.error(error)
    }
  },
  listenDeploymentStatus: async () => {
    const dispatch = useDispatch()
    try {
      window.electronAPI.on(Channels.Shell.CheckSystemStatusResult, (data: AppModel) => {
        dispatch(DeploymentStatusAction.systemStatusReceived(data))
      })
      window.electronAPI.on(Channels.Shell.CheckAppStatusResult, (data: AppModel) => {
        dispatch(DeploymentStatusAction.appStatusReceived(data))
      })
      window.electronAPI.on(Channels.Shell.CheckClusterStatusResult, (data: AppModel) => {
        dispatch(DeploymentStatusAction.clusterStatusReceived(data))
      })
    } catch (error) {
      console.error(error)
    }
  }
}

//Action
export const DeploymentStatusAction = {
  fetchDeploymentStatus: () => {
    return {
      type: 'DEPLOYMENT_STATUS_FETCH' as const
    }
  },
  systemStatusReceived: (systemStatus: AppModel) => {
    return {
      type: 'SYSTEM_STATUS_RECEIVED' as const,
      systemStatus: systemStatus
    }
  },
  appStatusReceived: (appStatus: AppModel) => {
    return {
      type: 'APP_STATUS_RECEIVED' as const,
      appStatus: appStatus
    }
  },
  clusterStatusReceived: (clusterStatus: AppModel) => {
    return {
      type: 'CLUSTER_STATUS_RECEIVED' as const,
      clusterStatus: clusterStatus
    }
  }
}

export type DeploymentStatusActionType = ReturnType<typeof DeploymentStatusAction[keyof typeof DeploymentStatusAction]>
