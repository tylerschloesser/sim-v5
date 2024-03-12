import { Region, WebAppV1 } from '@tyle/cdk'
import { App } from 'aws-cdk-lib'
import * as path from 'path'
import * as url from 'url'

const app = new App()

new WebAppV1(app, {
  account: '063257577013',
  distPath: path.join(
    url.fileURLToPath(new URL('.', import.meta.url)),
    '../../app/dist',
  ),
  domain: {
    app: 'sim-v5.slg.dev',
    root: 'slg.dev',
  },
  region: Region.US_WEST_2,
  stackIdPrefix: 'SimV5',
})
