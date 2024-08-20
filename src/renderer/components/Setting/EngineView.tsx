import Channels from 'constants/Channels'
import Endpoints from 'constants/Endpoints'
import Commands from 'main/Clusters/BaseCluster/BaseCluster.commands'
import { cloneCluster } from 'models/Cluster'
import { ShellResponse } from 'models/ShellResponse'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { useConfigFileState } from 'renderer/services/ConfigFileService'
import { SettingsService } from 'renderer/services/SettingsService'

import { LoadingButton } from '@mui/lab'
import {
  Box,
  CircularProgress,
  FormControlLabel,
  InputAdornment,
  SxProps,
  TextField,
  Theme,
  Typography
} from '@mui/material'

import Storage from '../../../constants/Storage'
import InfoTooltip from '../../common/InfoTooltip'
import AlertDialog from '../../dialogs/AlertDialog'

interface Props {
  sx?: SxProps<Theme>
}

const EngineView = ({ sx }: Props) => {
  const { enqueueSnackbar } = useSnackbar()
  const [showDeploymentAlert, setDeploymentAlert] = useState(false)
  const [showDatabaseAlert, setDatabaseAlert] = useState(false)
  const [showEnvAlert, setEnvAlert] = useState(false)
  const [processingMakeAdmin, setProcessingMakeAdmin] = useState(false)
  const [processingDeploymentPrune, setProcessingDeploymentPrune] = useState(false)
  const [processingDatabaseClear, setProcessingDatabaseClear] = useState(false)
  const [processingEnvReset, setProcessingEnvReset] = useState(false)
  const [adminValue, setAdminValue] = useState('')

  const configFileState = useConfigFileState()
  const { selectedCluster } = configFileState.value

  if (!selectedCluster) {
    return <></>
  }

  const onMakeAdmin = async () => {
    try {
      setProcessingMakeAdmin(true)

      const clonedCluster = cloneCluster(selectedCluster)
      const enginePath = clonedCluster.configs[Storage.ENGINE_PATH]

      const command = `export MYSQL_PORT=${Endpoints.MYSQL_PORT}; cd ${enginePath}; npm run make-user-admin -- --id=${adminValue}`
      const output: ShellResponse = await window.electronAPI.invoke(
        Channels.Shell.ExecuteCommand,
        clonedCluster,
        command
      )

      const stringError = output.stderr?.toString().trim() || ''
      if (stringError.toLowerCase().includes('error') || stringError.toLowerCase().includes('does not exist')) {
        throw stringError
      }
    } catch (err) {
      enqueueSnackbar('Failed to make admin.', { variant: 'error' })
    }

    setProcessingMakeAdmin(false)
  }

  const onPruneDeployment = async () => {
    try {
      setDeploymentAlert(false)
      setProcessingDeploymentPrune(true)

      const clonedCluster = cloneCluster(selectedCluster)

      const command = Commands.DEPLOYMENT_PRUNE
      const output: ShellResponse = await window.electronAPI.invoke(
        Channels.Shell.ExecuteCommand,
        clonedCluster,
        command
      )

      const stringError = output.stderr?.toString().trim() || ''
      if (stringError.toLowerCase().includes('error')) {
        throw stringError
      }
    } catch (err) {
      enqueueSnackbar('Failed to remove Infinite Reality Engine deployment.', { variant: 'error' })
    }

    setProcessingDeploymentPrune(false)
  }

  const onClearDatabase = async () => {
    try {
      setDatabaseAlert(false)
      setProcessingDatabaseClear(true)

      const clonedCluster = cloneCluster(selectedCluster)
      const enginePath = clonedCluster.configs[Storage.ENGINE_PATH]

      const command = `
        docker container stop ir-engine_minikube_db;
        docker container stop ir-engine_test_db;
        docker container rm ir-engine_minikube_db;
        docker container rm ir-engine_test_db;
        docker container prune --force;
        cd '${enginePath}';
        npm run dev-docker`
      const output: ShellResponse = await window.electronAPI.invoke(
        Channels.Shell.ExecuteCommand,
        clonedCluster,
        command
      )

      const stringError = output.stderr?.toString().trim() || ''
      if (stringError.toLowerCase().includes('error')) {
        throw stringError
      }
    } catch (err) {
      enqueueSnackbar('Failed to clear database.', { variant: 'error' })
    }

    setProcessingDatabaseClear(false)
  }

  const onResetEnv = async () => {
    try {
      setEnvAlert(false)
      setProcessingEnvReset(true)

      const clonedCluster = cloneCluster(selectedCluster)
      const enginePath = clonedCluster.configs[Storage.ENGINE_PATH]
      const envPath = enginePath + '/' + Endpoints.Paths.ENGINE_ENV

      const password = await SettingsService.getDecryptedSudoPassword()

      const command = `echo '${password}' | sudo -S rm -- ${envPath}; cd ${enginePath}; cp .env.local.default .env.local`
      const output: ShellResponse = await window.electronAPI.invoke(
        Channels.Shell.ExecuteCommand,
        clonedCluster,
        command
      )

      const stringError = output.stderr?.toString().trim() || ''
      if (stringError.toLowerCase().includes('error')) {
        throw stringError
      }
    } catch (err) {
      enqueueSnackbar('Failed to reset .env.local file.', { variant: 'error' })
    }

    setProcessingEnvReset(false)
  }

  return (
    <Box sx={sx}>
      <Box display="flex" width="100%" alignItems="center">
        <TextField
          fullWidth
          margin="dense"
          size="small"
          label={'FORCE MAKE ADMIN'}
          value={adminValue}
          sx={{
            '& .MuiInputBase-root': { paddingRight: 0 }
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <LoadingButton
                  variant="outlined"
                  sx={{ marginLeft: 4, width: processingMakeAdmin ? 150 : 'auto', height: 40 }}
                  loading={processingMakeAdmin}
                  disabled={adminValue === ''}
                  loadingIndicator={
                    <Box sx={{ display: 'flex', color: 'var(--textColor)' }}>
                      <CircularProgress size={24} sx={{ marginRight: 2 }} />
                      Making
                    </Box>
                  }
                  onClick={() => onMakeAdmin()}
                >
                  {processingMakeAdmin ? '' : 'Make'}
                </LoadingButton>
              </InputAdornment>
            )
          }}
          onChange={(event) => {
            setAdminValue(event.target.value)
          }}
        />
        <InfoTooltip sx={{ cursor: 'pointer' }} message="This will make the entered User ID an admin." />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline' }}>
        <FormControlLabel
          labelPlacement="start"
          label={
            <Box sx={{ display: 'flex', alignItems: 'top', flexDirection: 'row' }}>
              <Typography variant="body2">REMOVE ENGINE DEPLOYMENT</Typography>
              <InfoTooltip message="This will remove engine deployment from your current cluster." />
            </Box>
          }
          control={<></>}
          sx={{ marginTop: 2, marginLeft: 0 }}
        />
        <LoadingButton
          variant="outlined"
          sx={{ marginLeft: 4, width: processingDeploymentPrune ? 130 : 'auto' }}
          loading={processingDeploymentPrune}
          loadingIndicator={
            <Box sx={{ display: 'flex', color: 'var(--textColor)' }}>
              <CircularProgress size={24} sx={{ marginRight: 1 }} />
              Pruning
            </Box>
          }
          onClick={() => setDeploymentAlert(true)}
        >
          Prune
        </LoadingButton>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline' }}>
        <FormControlLabel
          labelPlacement="start"
          label={
            <Box sx={{ display: 'flex', alignItems: 'top', flexDirection: 'row' }}>
              <Typography variant="body2">CLEAR DATABASE</Typography>
              <InfoTooltip message="This will clear the database associated with your deployment." />
            </Box>
          }
          control={<></>}
          sx={{ marginTop: 2, marginLeft: 0 }}
        />
        <LoadingButton
          variant="outlined"
          sx={{ marginLeft: 4, width: processingDatabaseClear ? 130 : 'auto' }}
          loading={processingDatabaseClear}
          loadingIndicator={
            <Box sx={{ display: 'flex', color: 'var(--textColor)' }}>
              <CircularProgress size={24} sx={{ marginRight: 1 }} />
              Clearing
            </Box>
          }
          onClick={() => setDatabaseAlert(true)}
        >
          Clear
        </LoadingButton>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline' }}>
        <FormControlLabel
          labelPlacement="start"
          label={
            <Box sx={{ display: 'flex', alignItems: 'top', flexDirection: 'row' }}>
              <Typography variant="body2">RESET .ENV.LOCAL</Typography>
              <InfoTooltip message="This will reset .env.local file in your Infinite Reality Engine local repo." />
            </Box>
          }
          control={<></>}
          sx={{ marginTop: 2, marginLeft: 0 }}
        />
        <LoadingButton
          variant="outlined"
          sx={{ marginLeft: 4, width: processingEnvReset ? 130 : 'auto' }}
          loading={processingEnvReset}
          loadingIndicator={
            <Box sx={{ display: 'flex', color: 'var(--textColor)' }}>
              <CircularProgress size={24} sx={{ marginRight: 1 }} />
              Resetting
            </Box>
          }
          onClick={() => setEnvAlert(true)}
        >
          Reset
        </LoadingButton>
      </Box>

      {showDeploymentAlert && (
        <AlertDialog
          title="Confirmation"
          message="Are you sure you want to proceed? This will remove the Infinite Reality Engine deployment from your current cluster."
          okButtonText="Proceed"
          onClose={() => setDeploymentAlert(false)}
          onOk={onPruneDeployment}
        />
      )}
      {showDatabaseAlert && (
        <AlertDialog
          title="Confirmation"
          message="Are you sure you want to proceed? This will clear the database associated with your deployment."
          okButtonText="Proceed"
          onClose={() => setDatabaseAlert(false)}
          onOk={onClearDatabase}
        />
      )}
      {showEnvAlert && (
        <AlertDialog
          title="Confirmation"
          message="Are you sure you want to proceed? This will reset .env.local file in your Infinite Reality Engine local repo."
          okButtonText="Proceed"
          onClose={() => setEnvAlert(false)}
          onOk={onResetEnv}
        />
      )}
    </Box>
  )
}

export default EngineView
