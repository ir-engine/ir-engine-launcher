import Channels from 'constants/Channels'
import Commands from 'main/Clusters/BaseCluster/BaseCluster.commands'
import { cloneCluster } from 'models/Cluster'
import { ShellResponse } from 'models/ShellResponse'
import { enqueueSnackbar } from 'notistack'
import { SettingsService, useSettingsState } from 'renderer/services/SettingsService'

import { Avatar, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'

import logoMinikube from '../../../assets/icons/minikube.png'

interface Props {
  onClose: () => void
}

const MokRestartDialog = ({ onClose }: Props) => {
  const settingsState = useSettingsState()
  const selectedCluster = settingsState.value.mokRestartCluster

  const onRestart = async () => {
    try {
      const clonedCluster = cloneCluster(selectedCluster!)

      const password = await SettingsService.getDecryptedSudoPassword()

      const command = Commands.MOK_RESTART.replaceAll('sudo', `echo "${password}" | sudo -S`)

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
      enqueueSnackbar('Failed to restart.', { variant: 'error' })
    }
  }

  return (
    <Dialog open fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle>To continue system needs to be rebooted</DialogTitle>
      <DialogContent dividers sx={{ padding: 0 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            mb: 2,
            ml: 3,
            mr: 3,
            mt: 2
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'row' }}>
            <Box
              sx={{
                height: '100%',
                maxWidth: 80,
                flexDirection: 'column',
                display: 'flex',
                alignItems: 'center',
                paddingRight: 2,
                gap: 1
              }}
            >
              <Box sx={{ width: 45 }} component="img" src={logoMinikube} />
              <Typography variant="body1" title={selectedCluster?.name} className="textEllipse">
                {selectedCluster?.name}
              </Typography>
            </Box>
            <Typography variant="body2">
              Secure Boot Module Signature key has been setup, you will need to restart this system to enroll it. After
              restarting, you will be presented with a MOK manager.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'row' }}>
            <Typography variant="body2" sx={{ marginTop: 2 }}>
              Please follow these steps in the MOK manager to enroll a Secure Boot Module Signature key for your system:
            </Typography>
          </Box>
          <Box sx={{ ml: 1.5, mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'row' }}>
              <Avatar sx={{ width: 30, height: 30, fontSize: 16, bgcolor: 'var(--panelBackground)', mr: 1 }}>1</Avatar>
              <Typography variant="body2">Press any key on first screen</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'row', mt: 1 }}>
              <Avatar sx={{ width: 30, height: 30, fontSize: 16, bgcolor: 'var(--panelBackground)', mr: 1 }}>2</Avatar>
              <Typography variant="body2">Select 'Enroll MOK' option</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'row', mt: 1 }}>
              <Avatar sx={{ width: 30, height: 30, fontSize: 16, bgcolor: 'var(--panelBackground)', mr: 1 }}>3</Avatar>
              <Typography variant="body2">Select 'Continue' on 'Enroll MOK' screen</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'row', mt: 1 }}>
              <Avatar sx={{ width: 30, height: 30, fontSize: 16, bgcolor: 'var(--panelBackground)', mr: 1 }}>4</Avatar>
              <Typography variant="body2">Select 'Yes' on 'Enroll the key(s)' screen</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'row', mt: 1 }}>
              <Avatar sx={{ width: 30, height: 30, fontSize: 16, bgcolor: 'var(--panelBackground)', mr: 1 }}>5</Avatar>
              <Typography variant="body2">Enter MOK management password, which you used in the terminal</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'row', mt: 1 }}>
              <Avatar sx={{ width: 30, height: 30, fontSize: 16, bgcolor: 'var(--panelBackground)', mr: 1 }}>6</Avatar>
              <Typography variant="body2">Select 'Reboot' option in the final screen</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column', mt: 1 }}>
            <Typography variant="body2">
              After rebooting you can run 'Configure' button in Infinite Reality Engine Launcher again
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column', mt: 1 }}>
            <Typography variant="body2" sx={{ marginTop: 2, fontWeight: 600 }}>
              Do you want to reboot the system?
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" onClick={onRestart}>
          Yes
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default MokRestartDialog
