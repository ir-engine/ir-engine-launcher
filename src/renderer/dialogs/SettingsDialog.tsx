import Storage from 'constants/Storage'
import UIEnabled from 'constants/UIEnabled'
import { ClusterModel, ClusterType } from 'models/Cluster'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import AdditionalConfigsView from 'renderer/components/Setting/AdditionalConfigsView'
import MicroK8sView from 'renderer/components/Setting/MicroK8sView'
import { ConfigFileService, useConfigFileState } from 'renderer/services/ConfigFileService'
import { DeploymentService } from 'renderer/services/DeploymentService'
import { useSettingsState } from 'renderer/services/SettingsService'

import { TabContext, TabPanel } from '@mui/lab'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  LinearProgress,
  Tab,
  Tabs,
  Typography
} from '@mui/material'

import logo from '../../../assets/icon.svg'
import ConfigsView from '../components/Config/ConfigsView'
import VarsView from '../components/Config/VarsView'
import BackupView from '../components/Setting/BackupView'
import EngineView from '../components/Setting/EngineView'
import MinikubeView from '../components/Setting/MinikubeView'

interface Props {
  onClose: () => void
}

const SettingsDialog = ({ onClose }: Props) => {
  const { enqueueSnackbar } = useSnackbar()
  const configFileState = useConfigFileState()
  const { loading, selectedCluster } = configFileState.value
  const settingsState = useSettingsState()
  const [currentTab, setTab] = useState(
    selectedCluster && UIEnabled[selectedCluster.type].settings.configs ? 'configs' : 'backup'
  )
  const { appVersion } = settingsState.value.appSysInfo
  const [tempConfigs, setTempConfigs] = useState({} as Record<string, string>)
  const [tempVars, setTempVars] = useState({} as Record<string, string>)

  const showAllBranches = localStorage.getItem(Storage.SHOW_ALL_BRANCHES) as string | undefined
  const defaultFlags = {
    [Storage.SHOW_ALL_BRANCHES]: showAllBranches ? showAllBranches : 'false'
  } as Record<string, string>
  const [localFlags, setLocalFlags] = useState(defaultFlags)

  if (!selectedCluster) {
    enqueueSnackbar('Please select a cluster.', { variant: 'error' })
    onClose()
    return <></>
  }

  const localConfigs = {} as Record<string, string>
  for (const key in selectedCluster.configs) {
    localConfigs[key] = key in tempConfigs ? tempConfigs[key] : selectedCluster.configs[key]
  }

  const localVars = {} as Record<string, string>
  for (const key in selectedCluster.variables) {
    localVars[key] = key in tempVars ? tempVars[key] : selectedCluster.variables[key]
  }

  const changeFlag = async (key: string, value: string) => {
    const newFlags = { ...localFlags }
    newFlags[key] = value
    setLocalFlags(newFlags)
  }

  const changeConfig = async (key: string, value: string) => {
    const newConfigs = { ...tempConfigs }
    newConfigs[key] = value
    setTempConfigs(newConfigs)
  }

  const changeVar = async (key: string, value: string) => {
    const newVars = { ...tempVars }
    newVars[key] = value
    setTempVars(newVars)
  }

  const saveSettings = async () => {
    const updatedCluster: ClusterModel = {
      ...selectedCluster,
      configs: { ...selectedCluster.configs },
      variables: { ...selectedCluster.variables }
    }

    for (const key in tempConfigs) {
      updatedCluster.configs[key] = tempConfigs[key]
    }

    for (const key in tempVars) {
      updatedCluster.variables[key] = tempVars[key]
    }

    localStorage.setItem(Storage.SHOW_ALL_BRANCHES, localFlags[Storage.SHOW_ALL_BRANCHES])

    const saved = await ConfigFileService.insertOrUpdateConfig(updatedCluster)
    if (saved) {
      onClose()
    }

    await DeploymentService.fetchDeploymentStatus(updatedCluster)
  }

  return (
    <Dialog open fullWidth maxWidth="sm" scroll="paper">
      {loading && <LinearProgress />}

      <DialogTitle>Settings</DialogTitle>
      <DialogContent dividers sx={{ padding: 0 }}>
        <TabContext value={currentTab}>
          <Box sx={{ height: '40vh', display: 'flex' }}>
            <Tabs
              orientation="vertical"
              className="settingTabs"
              value={currentTab}
              onChange={(_event, newValue) => setTab(newValue)}
              sx={{ borderRight: 1, borderColor: 'divider' }}
            >
              {UIEnabled[selectedCluster.type].settings.configs && <Tab label="Configs" value="configs" />}
              {UIEnabled[selectedCluster.type].settings.variables && <Tab label="Variables" value="variables" />}
              {selectedCluster.type === ClusterType.Minikube && <Tab label="Minikube" value="minikube" />}
              {selectedCluster.type === ClusterType.MicroK8s && <Tab label="MicroK8s" value="microK8s" />}
              {(selectedCluster.type === ClusterType.MicroK8s || selectedCluster.type === ClusterType.Minikube) && (
                <Tab label="Engine" value="engine" />
              )}
              <Tab label="Backup" value="backup" />
              <Tab label="About" value="about" />
            </Tabs>
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
              {UIEnabled[selectedCluster.type].settings.configs && (
                <TabPanel value="configs">
                  <ConfigsView
                    localConfigs={localConfigs}
                    onChange={changeConfig}
                    sx={{ display: 'flex', flexDirection: 'column', alignItems: 'start' }}
                  />
                  <AdditionalConfigsView localFlags={localFlags} onChange={changeFlag} />
                </TabPanel>
              )}
              {UIEnabled[selectedCluster.type].settings.variables && (
                <TabPanel value="variables">
                  <VarsView
                    localVars={localVars}
                    onChange={changeVar}
                    sx={{ display: 'flex', flexDirection: 'column', alignItems: 'start' }}
                  />
                </TabPanel>
              )}
              {selectedCluster.type === ClusterType.Minikube && (
                <TabPanel value="minikube">
                  <MinikubeView sx={{ display: 'flex', flexDirection: 'column', alignItems: 'start' }} />
                </TabPanel>
              )}
              {selectedCluster.type === ClusterType.MicroK8s && (
                <TabPanel value="microK8s">
                  <MicroK8sView sx={{ display: 'flex', flexDirection: 'column', alignItems: 'start' }} />
                </TabPanel>
              )}
              <TabPanel value="engine">
                <EngineView sx={{ display: 'flex', flexDirection: 'column', alignItems: 'start' }} />
              </TabPanel>
              <TabPanel value="backup">
                <BackupView
                  hasPendingChanges={Object.keys(tempConfigs).length !== 0 || Object.keys(tempVars).length !== 0}
                  sx={{ display: 'flex', flexDirection: 'column', alignItems: 'start' }}
                />
              </TabPanel>
              <TabPanel value="about">
                <Box>
                  <Box sx={{ display: 'flex', mr: 6, mb: 2, alignItems: 'center', flexDirection: 'row' }}>
                    <Box sx={{ height: 45, mr: 0.7 }} component="img" src={logo} />
                    <Typography variant="h6">Launcher</Typography>
                  </Box>
                  <DialogContentText variant="button">App Version: {appVersion}</DialogContentText>
                </Box>
              </TabPanel>
            </Box>
          </Box>
        </TabContext>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          type="submit"
          disabled={
            loading ||
            (Object.keys(tempConfigs).length === 0 &&
              Object.keys(tempVars).length === 0 &&
              JSON.stringify(defaultFlags) === JSON.stringify(localFlags))
          }
          onClick={saveSettings}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SettingsDialog
