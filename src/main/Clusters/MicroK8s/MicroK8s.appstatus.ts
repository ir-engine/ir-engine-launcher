import os from 'os'

import { AppModel, getAppModel } from '../../../models/AppStatus'

const type = os.type()

let microk8sPrefix = ''

if (type === 'Windows_NT') {
  microk8sPrefix = '/snap/bin/'
}

const microk8sDependantScript = (script: string) => {
  // Escape special characters.
  script = script.replaceAll('$', '`$')

  return `
  if ${microk8sPrefix}microk8s status | grep -q 'microk8s is not running'; then
    echo 'MicroK8s not configured' >&2;
    exit 1;
  else
    ${script}
    exit 0;
  fi
  `
}

export const MicroK8sAppsStatus: AppModel[] = [
  getAppModel('node', 'Node', 'node --version;'),
  getAppModel('npm', 'npm', 'npm --version;'),
  getAppModel('python', 'Python', 'pip3 --version; python3 --version;'),
  getAppModel('make', 'Make', 'make --version;'),
  getAppModel('git', 'Git', 'git --version;'),
  getAppModel('docker', 'Docker', 'docker --version;'),
  getAppModel('dockercompose', 'Docker Compose', 'docker-compose --version;'),
  getAppModel('mysql', 'MySql', 'docker top xrengine_minikube_db;'),
  getAppModel('kubectl', 'kubectl', 'kubectl version --client --output=yaml;'),
  getAppModel('helm', 'Helm', 'helm version;'),
  getAppModel(
    'microk8s',
    'MicroK8s',
    microk8sDependantScript(`${microk8sPrefix}microk8s version;${microk8sPrefix}microk8s status;`)
  ),
  getAppModel(
    'ingress',
    'Ingress',
    microk8sDependantScript(
      "kubectl exec -i -n ingress $(kubectl get pods -n ingress -l name=nginx-ingress-microk8s --field-selector=status.phase==Running -o jsonpath='{.items[0].metadata.name}') -- /nginx-ingress-controller --version;"
    )
  ),
  getAppModel('redis', 'Redis', microk8sDependantScript(`helm status local-redis;`)),
  getAppModel('agones', 'Agones', microk8sDependantScript(`helm status agones;`)),
  getAppModel(
    'fileserver',
    'Local File Server',
    `
  if lsof -Pi :8642 -sTCP:LISTEN -t >/dev/null ; then
    echo 'File server configured:';
    lsof -Pi :8642 -sTCP:LISTEN;
    exit 0;
  else
    echo 'File server not configured' >&2;
    exit 1;
  fi
  `
  ),
  getAppModel(
    'hostfile',
    'Hostfile',
    type === 'Windows_NT'
      ? `
      $content = Get-Content "$env:SystemRoot\\System32\\drivers\\etc\\hosts" -Raw
      $wslIps = wsl hostname -I

      if ($wslIps -like "* *") {
      	$wslIp = $wslIps.split(" ")[0]

        if ($content -like "*local.etherealengine.com*") {
          if ($content -like "*$wslIp*") {
              Write-Host "*.etherealengine.com entries exists"
          } else {
              throw "*.etherealengine.com entries outdated"
          }
        } else {
          throw "*.etherealengine.com entries does not exist"
        }

        if ($content -like "*microk8s.registry*") {
          if ($content -like "*$wslIp*") {
              Write-Host "microk8s.registry entries exists"
          } else {
              throw "microk8s.registry entries outdated"
          }
        } else {
          throw "microk8s.registry entries does not exist"
        }
      } else {
      	throw "Kindly make sure WSL is installed and Ubuntu distro is set as default."
      }
      `
      : microk8sDependantScript(
          `
      if grep -q 'local.etherealengine.com' /etc/hosts; then
          if grep -q '127.0.0.1 local.etherealengine.com' /etc/hosts; then
              echo '*.etherealengine.com entries exists'
              exit 0;
          else
            echo '*.etherealengine.com entries outdated' >&2;
            exit 1;
          fi
      else
        echo '*.etherealengine.com entries does not exist' >&2;
        exit 1;
      fi
    `
        ),
    type !== 'Windows_NT'
  ),
  getAppModel('engine', 'Ethereal Engine', microk8sDependantScript(`helm status local;`))
]

export const MicroK8sRippleAppsStatus: AppModel[] = [
  getAppModel(
    'rippled',
    'Rippled',
    microk8sDependantScript('helm status local-rippled;'),
    true,
    undefined,
    undefined,
    undefined,
    true
  ),
  getAppModel(
    'ipfs',
    'IPFS',
    microk8sDependantScript('helm status local-ipfs;'),
    true,
    undefined,
    undefined,
    undefined,
    true
  )
]
