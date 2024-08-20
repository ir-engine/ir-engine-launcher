import * as k8s from '@kubernetes/client-node'
import log from 'electron-log'

import { Workloads, WorkloadsContainerInfo, WorkloadsPodInfo } from '../../../models/Workloads'

export const getWorkloads = async (k8DefaultClient: k8s.CoreV1Api, releaseName: string): Promise<Workloads[]> => {
  const workloads: Workloads[] = []

  try {
    log.info('Attempting to check k8s workloads')

    const builderPods = await getPodsData(
      k8DefaultClient,
      `app.kubernetes.io/instance=${releaseName}-builder`,
      'builder',
      'Builder'
    )
    workloads.push(builderPods)

    const clientPods = await getPodsData(
      k8DefaultClient,
      `app.kubernetes.io/instance=${releaseName},app.kubernetes.io/component=client`,
      'client',
      'Client'
    )
    workloads.push(clientPods)

    const apiPods = await getPodsData(
      k8DefaultClient,
      `app.kubernetes.io/instance=${releaseName},app.kubernetes.io/component=api`,
      'api',
      'Api'
    )
    workloads.push(apiPods)

    const instancePods = await getPodsData(
      k8DefaultClient,
      'agones.dev/role=gameserver',
      'instance',
      'Instance',
      `${releaseName}-instanceserver-`
    )
    workloads.push(instancePods)

    const taskPods = await getPodsData(
      k8DefaultClient,
      `app.kubernetes.io/instance=${releaseName},app.kubernetes.io/component=taskserver`,
      'task',
      'Task'
    )
    workloads.push(taskPods)

    const projectUpdatePods = await getPodsData(
      k8DefaultClient,
      `ir-engine/release=${releaseName},ir-engine/projectUpdater=true`,
      'projectUpdate',
      'Project Updater'
    )
    workloads.push(projectUpdatePods)
  } catch (e) {
    log.error(e)
    throw e
  }

  return workloads
}

export const removePod = async (
  k8DefaultClient: k8s.CoreV1Api,
  podName: string
): Promise<WorkloadsPodInfo | undefined> => {
  try {
    log.info(`Attempting to remove k8s pod ${podName}`)

    const podsResponse = await k8DefaultClient.deleteNamespacedPod(podName, 'default')
    const pod = getWorkloadsPodInfo(podsResponse.body)

    return pod
  } catch (e) {
    log.error(e)
    throw e
  }

  return undefined
}

export const getPodLogs = async (
  k8DefaultClient: k8s.CoreV1Api,
  podName: string,
  containerName: string
): Promise<string> => {
  let serverLogs = ''

  try {
    log.info('Attempting to check k8s pod logs')

    const podLogs = await k8DefaultClient.readNamespacedPodLog(
      podName,
      'default',
      containerName,
      undefined,
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    )

    serverLogs = podLogs.body
  } catch (e) {
    log.error(e)
    throw e
  }

  return serverLogs
}

export const getPodsData = async (
  k8DefaultClient: k8s.CoreV1Api,
  labelSelector: string,
  id: string,
  label: string,
  nameFilter?: string
) => {
  let pods: WorkloadsPodInfo[] = []

  try {
    const podsResponse = await k8DefaultClient.listNamespacedPod(
      'default',
      undefined,
      false,
      undefined,
      undefined,
      labelSelector
    )

    let items = podsResponse.body.items
    if (nameFilter) {
      items = items.filter((item) => item.metadata?.name?.startsWith(nameFilter))
    }

    pods = getWorkloadsPodsInfo(items)
  } catch (err) {
    log.error('Failed to get pods info.', err)
  }

  return {
    id,
    label,
    pods
  }
}

export const getDeployments = async (k8AppsClient: k8s.AppsV1Api, labelSelector: string) => {
  try {
    const deploymentsResponse = await k8AppsClient.listNamespacedDeployment(
      'default',
      undefined,
      false,
      undefined,
      undefined,
      labelSelector
    )

    return deploymentsResponse
  } catch (err) {
    log.error('Failed to get deployments info.', err)
    return undefined
  }
}

const getWorkloadsPodsInfo = (items: k8s.V1Pod[]) => {
  return items.map((item) => {
    return getWorkloadsPodInfo(item)
  })
}

const getWorkloadsPodInfo = (item: k8s.V1Pod) => {
  return {
    name: item.metadata?.name,
    status: item.status?.phase,
    age: item.status?.startTime,
    containers: getWorkloadsContainerInfo(item.status?.containerStatuses!)
  } as WorkloadsPodInfo
}

const getWorkloadsContainerInfo = (items: k8s.V1ContainerStatus[]) => {
  return items.map((item) => {
    return {
      name: item.name,
      status: item.state?.running
        ? 'Running'
        : item.state?.terminated
        ? 'Terminated'
        : item.state?.waiting
        ? 'Waiting'
        : 'Undefined',
      ready: item.ready,
      started: item.started,
      restarts: item.restartCount,
      image: item.image
    } as WorkloadsContainerInfo
  })
}

export const getConfigMap = async (k8DefaultClient: k8s.CoreV1Api, labelSelector: string, nameFilter?: string) => {
  try {
    const configMapsResponse = await k8DefaultClient.listNamespacedConfigMap(
      'default',
      undefined,
      false,
      undefined,
      undefined,
      labelSelector
    )

    let items = configMapsResponse.body.items
    if (nameFilter) {
      items = items.filter((item) => item.metadata?.name?.startsWith(nameFilter))
    }

    return items
  } catch (err) {
    log.error('Failed to get config maps.', err)
  }

  return []
}
