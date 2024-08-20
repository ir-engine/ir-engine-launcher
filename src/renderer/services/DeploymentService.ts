import { hookstate, none, useHookstate } from '@hookstate/core'
import { delay } from 'common/UtilitiesManager'
import Channels from 'constants/Channels'
import Storage from 'constants/Storage'
import { AppModel, DeploymentAppModel } from 'models/AppStatus'
import { OSType } from 'models/AppSysInfo'
import { cloneCluster, ClusterModel } from 'models/Cluster'
import { FetchableItem } from 'models/FetchableItem'
import { GitStatus } from 'models/GitStatus'

import { store, useDispatch } from '../store'
import { accessSettingsState, SettingsService } from './SettingsService'

type DeploymentState = {
  clusterId: string
  isConfiguring: boolean
  isFirstFetched: boolean
  isFetchingStatuses: boolean
  gitStatus: Record<string, FetchableItem<GitStatus | undefined>>
  ipfs: FetchableItem<string>
  adminPanel: FetchableItem<boolean>
  k8dashboard: FetchableItem<string>
  systemStatus: AppModel[]
  appStatus: AppModel[]
  engineStatus: AppModel[]
}

//State
const state = hookstate<DeploymentState[]>([])

store.receptors.push((action: DeploymentActionType): void => {
  switch (action.type) {
    case 'SET_CONFIGURING': {
      const index = state.findIndex((item) => item.clusterId.value === action.clusterId)
      if (index !== -1) {
        state[index].isConfiguring.set(action.isConfiguring)
      }
      break
    }
    case 'SET_FETCHING_STATUSES': {
      try {
        const index = state.findIndex((item) => item.clusterId.value === action.clusterId)
        if (index !== -1) {
          state[index].isFetchingStatuses.set(action.isFetchingStatuses)

          if (action.isFetchingStatuses === false) {
            state[index].isFirstFetched.set(true)
          }
        }
      } catch (err) {
        console.log(err)
      }
      break
    }
    case 'SET_DEPLOYMENT_APPS': {
      const index = state.findIndex((item) => item.clusterId.value === action.clusterId)
      if (index !== -1) {
        state[index].isFetchingStatuses.set(true)
        state[index].systemStatus.set([...action.deploymentApps.systemStatus])
        state[index].appStatus.set([...action.deploymentApps.appStatus])
        state[index].engineStatus.set([...action.deploymentApps.engineStatus])
      } else {
        state.merge([
          {
            clusterId: action.clusterId,
            isConfiguring: false,
            isFirstFetched: false,
            isFetchingStatuses: false,
            gitStatus: {
              [Storage.ENGINE_PATH]: {
                loading: false,
                data: undefined,
                error: ''
              },
              [Storage.OPS_PATH]: {
                loading: false,
                data: undefined,
                error: ''
              }
            },
            ipfs: {
              loading: false,
              data: '',
              error: ''
            },
            adminPanel: {
              loading: false,
              data: false,
              error: ''
            },
            k8dashboard: {
              loading: false,
              data: '',
              error: ''
            },
            systemStatus: [...action.deploymentApps.systemStatus],
            appStatus: [...action.deploymentApps.appStatus],
            engineStatus: [...action.deploymentApps.engineStatus]
          } as DeploymentState
        ])
      }
      break
    }
    case 'REMOVE_DEPLOYMENT': {
      const index = state.findIndex((item) => item.clusterId.value === action.clusterId)
      if (index !== -1) {
        state[index].set(none)
      }
      break
    }
    case 'SET_GIT_STATUS': {
      const index = state.findIndex((item) => item.clusterId.value === action.clusterId)
      if (index !== -1) {
        state[index].gitStatus[action.repoType].set(action.payload)
      }
      break
    }
    case 'SET_K8_DASHBOARD': {
      const index = state.findIndex((item) => item.clusterId.value === action.clusterId)
      if (index !== -1) {
        state[index].k8dashboard.set(action.payload)
      }
      break
    }
    case 'SET_IPFS_DASHBOARD': {
      const index = state.findIndex((item) => item.clusterId.value === action.clusterId)
      if (index !== -1) {
        state[index].ipfs.set(action.payload)
      }
      break
    }
    case 'SET_ADMIN_PANEL': {
      const index = state.findIndex((item) => item.clusterId.value === action.clusterId)
      if (index !== -1) {
        state[index].adminPanel.set(action.payload)
      }
      break
    }
    case 'SYSTEM_STATUS_RECEIVED': {
      const index = state.findIndex((item) => item.clusterId.value === action.clusterId)
      if (index !== -1) {
        const statusIndex = state[index].systemStatus.findIndex((app) => app.id.value === action.systemStatus.id)
        state[index].systemStatus.merge({ [statusIndex]: action.systemStatus })
      }
      break
    }
    case 'APP_STATUS_RECEIVED': {
      const index = state.findIndex((item) => item.clusterId.value === action.clusterId)
      if (index !== -1) {
        const statusIndex = state[index].appStatus.findIndex((app) => app.id.value === action.appStatus.id)
        state[index].appStatus.merge({ [statusIndex]: action.appStatus })
      }
      break
    }
    case 'ENGINE_STATUS_RECEIVED': {
      const index = state.findIndex((item) => item.clusterId.value === action.clusterId)
      if (index !== -1) {
        const statusIndex = state[index].engineStatus.findIndex((app) => app.id.value === action.engineStatus.id)
        state[index].engineStatus.merge({ [statusIndex]: action.engineStatus })
      }
      break
    }
  }
})

export const accessDeploymentState = () => state

export const useDeploymentState = () => useHookstate(state) as any as typeof state

//Service
export const DeploymentService = {
  getDeploymentStatus: async (cluster: ClusterModel, sudoPassword?: string) => {
    // Here we are cloning cluster object so that when selected Cluster is changed,
    // The context cluster does not change.
    const clonedCluster = cloneCluster(cluster)
    const dispatch = useDispatch()

    try {
      const deploymentApps: DeploymentAppModel = await window.electronAPI.invoke(
        Channels.Cluster.GetClusterStatus,
        clonedCluster,
        sudoPassword
      )

      dispatch(DeploymentAction.setDeploymentApps(clonedCluster.id, deploymentApps))
      return deploymentApps
    } catch (error) {
      console.error(error)
      return undefined
    }
  },
  fetchDeploymentStatus: async (cluster: ClusterModel) => {
    // Here we are cloning cluster object so that when selected Cluster is changed,
    // The context cluster does not change.
    const clonedCluster = cloneCluster(cluster)

    let appSysInfo = accessSettingsState().value.appSysInfo
    const dispatch = useDispatch()

    try {
      let password: undefined | string = undefined

      if (appSysInfo.osType !== OSType.Windows) {
        password = await SettingsService.getDecryptedSudoPassword()
      }

      DeploymentService.fetchGitStatuses(clonedCluster)

      const deploymentApps = await DeploymentService.getDeploymentStatus(clonedCluster, password)
      if (deploymentApps) {
        await window.electronAPI.invoke(Channels.Cluster.CheckClusterStatus, clonedCluster, deploymentApps)
      }
    } catch (error) {
      console.error(error)
    }

    dispatch(DeploymentAction.setFetchingStatuses(clonedCluster.id, false))
  },
  removeDeploymentStatus: async (clusterId: string) => {
    const dispatch = useDispatch()
    dispatch(DeploymentAction.removeDeployment(clusterId))
  },
  fetchK8Dashboard: async (cluster: ClusterModel) => {
    // Here we are cloning cluster object so that when selected Cluster is changed,
    // The context cluster does not change.
    const clonedCluster = cloneCluster(cluster)
    const dispatch = useDispatch()
    try {
      dispatch(DeploymentAction.setK8Dashboard(clonedCluster.id, '', true))
      window.electronAPI.invoke(Channels.Cluster.ConfigureK8Dashboard, clonedCluster)
    } catch (error) {
      console.error(error)
    }
  },
  clearK8Dashboard: async (clusterId: string) => {
    const dispatch = useDispatch()
    dispatch(DeploymentAction.setK8Dashboard(clusterId))
  },
  fetchGitStatus: async (cluster: ClusterModel, repoType: string) => {
    // Here we are cloning cluster object so that when selected Cluster is changed,
    // The context cluster does not change.
    const clonedCluster = cloneCluster(cluster)
    const dispatch = useDispatch()

    try {
      dispatch(DeploymentAction.setGitStatus(clonedCluster.id, repoType, undefined, true))
      const gitStatus: GitStatus = await window.electronAPI.invoke(
        Channels.Git.GetCurrentConfigs,
        clonedCluster,
        clonedCluster.configs[repoType]
      )
      dispatch(DeploymentAction.setGitStatus(clonedCluster.id, repoType, gitStatus, false))
    } catch (error) {
      console.error(error)
      dispatch(DeploymentAction.setGitStatus(clonedCluster.id, repoType, undefined, false))
    }
  },
  fetchGitStatuses: async (cluster: ClusterModel) => {
    await Promise.all([
      DeploymentService.fetchGitStatus(cluster, Storage.ENGINE_PATH),
      DeploymentService.fetchGitStatus(cluster, Storage.OPS_PATH)
    ])
  },
  fetchIpfsDashboard: async (cluster: ClusterModel) => {
    // Here we are cloning cluster object so that when selected Cluster is changed,
    // The context cluster does not change.
    const clonedCluster = cloneCluster(cluster)
    const dispatch = useDispatch()
    try {
      dispatch(DeploymentAction.setIpfsDashboard(clonedCluster.id, '', true))
      window.electronAPI.invoke(Channels.Shell.ConfigureIPFSDashboard, clonedCluster)
    } catch (error) {
      console.error(error)
    }
  },
  clearIpfsDashboard: async (clusterId: string) => {
    const dispatch = useDispatch()
    dispatch(DeploymentAction.setIpfsDashboard(clusterId))
  },
  fetchAdminPanelAccess: async (cluster: ClusterModel) => {
    // Here we are cloning cluster object so that when selected Cluster is changed,
    // The context cluster does not change.
    const clonedCluster = cloneCluster(cluster)
    const dispatch = useDispatch()
    try {
      dispatch(DeploymentAction.setAdminPanel(clonedCluster.id, false, true))
      window.electronAPI.invoke(Channels.Engine.EnsureAdminAccess, clonedCluster)
    } catch (error) {
      console.error(error)
    }
  },
  clearAdminPanelAccess: async (clusterId: string) => {
    const dispatch = useDispatch()
    dispatch(DeploymentAction.setAdminPanel(clusterId))
  },
  processConfigurations: async (cluster: ClusterModel, password: string, flags: Record<string, string>) => {
    // Here we are cloning cluster object so that when selected Cluster is changed,
    // The context cluster does not change.
    const clonedCluster = cloneCluster(cluster)
    const dispatch = useDispatch()
    const { enqueueSnackbar } = accessSettingsState().value.notistack

    try {
      dispatch(DeploymentAction.setConfiguring(clonedCluster.id, true))

      await window.electronAPI.invoke(Channels.Cluster.ConfigureCluster, clonedCluster, password, flags)

      await delay(2000)

      DeploymentService.fetchDeploymentStatus(clonedCluster)
    } catch (error) {
      console.error(error)

      enqueueSnackbar('Failed to configure Infinite Reality Engine. Please check logs.', {
        variant: 'error'
      })
    }
    dispatch(DeploymentAction.setConfiguring(clonedCluster.id, false))
  },
  setConfiguring: (clusterId: string, isConfiguring: boolean) => {
    const dispatch = useDispatch()
    dispatch(DeploymentAction.setConfiguring(clusterId, isConfiguring))
  },
  listen: async () => {
    const dispatch = useDispatch()
    try {
      window.electronAPI.on(Channels.Cluster.CheckSystemStatusResult, (clusterId: string, data: AppModel) => {
        dispatch(DeploymentAction.systemStatusReceived(clusterId, data))
      })
      window.electronAPI.on(Channels.Cluster.CheckAppStatusResult, (clusterId: string, data: AppModel) => {
        dispatch(DeploymentAction.appStatusReceived(clusterId, data))
      })
      window.electronAPI.on(Channels.Cluster.CheckEngineStatusResult, (clusterId: string, data: AppModel) => {
        dispatch(DeploymentAction.engineStatusReceived(clusterId, data))
      })
      window.electronAPI.on(Channels.Cluster.ConfigureK8DashboardResponse, (clusterId: string, data: string) => {
        dispatch(DeploymentAction.setK8Dashboard(clusterId, data))
      })
      window.electronAPI.on(Channels.Cluster.ConfigureK8DashboardError, (clusterId: string, error: string) => {
        dispatch(DeploymentAction.setK8Dashboard(clusterId, '', false, error))
      })
      window.electronAPI.on(Channels.Shell.ConfigureIPFSDashboardResponse, (clusterId: string, data: string) => {
        dispatch(DeploymentAction.setIpfsDashboard(clusterId, data))
      })
      window.electronAPI.on(Channels.Shell.ConfigureIPFSDashboardError, (clusterId: string, error: string) => {
        dispatch(DeploymentAction.setIpfsDashboard(clusterId, '', false, error))
      })
      window.electronAPI.on(Channels.Engine.EnsureAdminAccessResponse, (clusterId: string) => {
        dispatch(DeploymentAction.setAdminPanel(clusterId, true))
      })
      window.electronAPI.on(Channels.Engine.EnsureAdminAccessError, (clusterId: string, error: string) => {
        dispatch(DeploymentAction.setAdminPanel(clusterId, false, false, error))
      })
    } catch (error) {
      console.error(error)
    }
  }
}

//Action
export const DeploymentAction = {
  setConfiguring: (clusterId: string, isConfiguring: boolean) => {
    return {
      type: 'SET_CONFIGURING' as const,
      clusterId,
      isConfiguring
    }
  },
  setFetchingStatuses: (clusterId: string, isFetchingStatuses: boolean) => {
    return {
      type: 'SET_FETCHING_STATUSES' as const,
      clusterId,
      isFetchingStatuses
    }
  },
  removeDeployment: (clusterId: string) => {
    return {
      type: 'REMOVE_DEPLOYMENT' as const,
      clusterId
    }
  },
  setDeploymentApps: (clusterId: string, deploymentApps: DeploymentAppModel) => {
    return {
      type: 'SET_DEPLOYMENT_APPS' as const,
      clusterId,
      deploymentApps
    }
  },
  setGitStatus: (clusterId: string, repoType: string, data: GitStatus | undefined, loading = false, error = '') => {
    return {
      type: 'SET_GIT_STATUS' as const,
      clusterId,
      repoType,
      payload: { loading, data, error } as FetchableItem<GitStatus | undefined>
    }
  },
  setK8Dashboard: (clusterId: string, data = '', loading = false, error = '') => {
    return {
      type: 'SET_K8_DASHBOARD' as const,
      clusterId,
      payload: { loading, data, error } as FetchableItem<string>
    }
  },
  setIpfsDashboard: (clusterId: string, data = '', loading = false, error = '') => {
    return {
      type: 'SET_IPFS_DASHBOARD' as const,
      clusterId,
      payload: { loading, data, error } as FetchableItem<string>
    }
  },
  setAdminPanel: (clusterId: string, data = false, loading = false, error = '') => {
    return {
      type: 'SET_ADMIN_PANEL' as const,
      clusterId,
      payload: { loading, data, error } as FetchableItem<boolean>
    }
  },
  systemStatusReceived: (clusterId: string, systemStatus: AppModel) => {
    return {
      type: 'SYSTEM_STATUS_RECEIVED' as const,
      clusterId,
      systemStatus: systemStatus
    }
  },
  appStatusReceived: (clusterId: string, appStatus: AppModel) => {
    return {
      type: 'APP_STATUS_RECEIVED' as const,
      clusterId,
      appStatus: appStatus
    }
  },
  engineStatusReceived: (clusterId: string, engineStatus: AppModel) => {
    return {
      type: 'ENGINE_STATUS_RECEIVED' as const,
      clusterId,
      engineStatus: engineStatus
    }
  }
}

export type DeploymentActionType = ReturnType<(typeof DeploymentAction)[keyof typeof DeploymentAction]>
