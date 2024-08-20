const Endpoints = {
  ALLOW_CERTIFICATES: [
    'local.ir-engine.org', // Client
    'api-local.ir-engine.org', // API Server
    'instanceserver-local.ir-engine.org', // Instance Server
    'localhost:9000', // MinIO
    'localhost:10443' // Microk8s Dashboard
  ],
  MYSQL_PORT: 3304,
  DEFAULT_ENGINE_FOLDER: 'ir-engine',
  DEFAULT_OPS_FOLDER: 'ir-engine-ops',
  Urls: {
    HOST: 'https://ir-engine.org',
    CLIENT_HOST: 'https://local.ir-engine.org',
    API_HOST: 'https://api-local.ir-engine.org',
    INSTANCE_HOST: 'https://instanceserver-local.ir-engine.org',
    MINIO_HOST: 'https://localhost:9000',
    ADMIN_PORTAL: 'https://local.ir-engine.org/admin',
    LOGIN_PAGE: 'https://local.ir-engine.org/',
    LAUNCH_PAGE: (host: string) => `${host.startsWith('https') ? '' : 'https://'}${host}/location/apartment`,
    ENGINE_ENV_DEFAULT: 'https://raw.githubusercontent.com/ir-engine/ir-engine/dev/.env.local.default',
    MINIKUBE_LINUX_SCRIPT:
      'https://raw.githubusercontent.com/ir-engine/ir-engine/launcher/master/assets/scripts/configure-minikube-linux.sh',
    MICROK8S_LINUX_SCRIPT:
      'https://raw.githubusercontent.com/ir-engine/ir-engine/launcher/master/assets/scripts/configure-microk8s-linux.sh',
    MICROK8S_WINDOWS_SCRIPT:
      'https://raw.githubusercontent.com/ir-engine/ir-engine/launcher/master/assets/scripts/configure-microk8s-windows.ps1',
    MINIKUBE_VALUES_TEMPLATE:
      'https://raw.githubusercontent.com/ir-engine/ir-engine-ops/master/configs/local.minikube.template.values.yaml',
    MICROK8S_VALUES_TEMPLATE:
      'https://raw.githubusercontent.com/ir-engine/ir-engine-ops/master/configs/local.microk8s.template.values.yaml',
    RIPPLED_CLI_DOCS: 'https://xrpl.org/commandline-usage.html',
    IPFS_VALUES_TEMPLATE:
      'https://raw.githubusercontent.com/ir-engine/ir-engine-ops/master/ipfs/values.yaml',
    MICROK8S_REGISTRY_CATALOG: 'http://localhost:32000/v2/_catalog',
    MICROK8S_WINDOWS_REGISTRY_CATALOG: 'http://microk8s.registry:32000/v2/_catalog',
    SUPPORT_GITHUB: 'https://github.com/ir-engine/ir-engine-launcher/issues',
    SUPPORT_DISCORD: 'https://discord.gg/xrf'
  },
  Paths: {
    ENGINE_ENV: '.env.local',
    ENGINE_ENV_DEFAULT: '.env.local.default',
    ENGINE_VALUES_FILE_NAME: 'engine.values.yaml',
    MINIKUBE_VALUES_TEMPLATE: 'configs/local.minikube.template.values.yaml',
    MICROK8S_VALUES_TEMPLATE: 'configs/local.microk8s.template.values.yaml',
    IPFS_VALUES_FILE_NAME: 'ipfs.values.yaml',
    IPFS_VALUES_TEMPLATE: 'ipfs/values.yaml',
    VALIDATOR_FILE: 'rippled/config/validators.txt',
    VALIDATOR_TEMPLATE: 'rippled/config/validators.template.txt',
    RIPPLED_FILE: 'rippled/config/rippled.cfg',
    RIPPLED_TEMPLATE: 'rippled/config/rippled.template.cfg',
    WSL_LOCALHOST_PREFIX: '\\\\wsl.localhost',
    WSL_$_PREFIX: '\\\\wsl$',
    FILE_SERVER: 'packages/server/upload'
  },
  Docs: {
    INSTALL_WSL:
      'https://etherealengine.github.io/etherealengine-docs/docs/host/devops_deployment/microk8s_windows/#install-windows-subsystem-for-linux-wsl',
    INSTALL_DOCKER:
      'https://etherealengine.github.io/etherealengine-docs/docs/host/devops_deployment/microk8s_windows/#install-docker-desktop',
    ACCEPT_INVALID_CERTS:
      'https://etherealengine.github.io/etherealengine-docs/docs/host/devops_deployment/microk8s_linux#accept-invalid-certs'
  }
}

export default Endpoints
