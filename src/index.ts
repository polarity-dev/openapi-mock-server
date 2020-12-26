import express, { RequestHandler } from "express"
import { middleware } from "express-openapi-validator"
import { OpenAPIV3 } from "express-openapi-validator/dist/framework/types"
import { RouteMetadata } from "express-openapi-validator/dist/framework/openapi.spec.loader"
import $RefParser from "@apidevtools/json-schema-ref-parser"
import bodyParser from "body-parser"
import jsf from "json-schema-faker"
import axios from "axios"
import cors from "cors"
import { join } from "path"
import validUrl from "valid-url"
import Debug from "debug"

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import argv from "simple-argv"

import { createOperationId } from "./lib/operation"
import { importConfigFile, configType, importOverridesFile } from "./lib/importConfig"
import { deletePathsSecurity } from "./lib/utils"
import { ExpressConfig } from "./types/expressConfig"
import { JsfConfig } from "./types/jsfConfig"

const debug = Debug("mock")

const serverConfig: configType = {
  express: {
    port: argv.port as number || 8080,
    validateRequests: false,
    validateResponses: false,
    openapiDefinition: argv.openapiDefinition as string,
    unknownFormats: "ignore"
  },
  jsf: {
    fillProperties: false,
    useExamplesValue: true,
    useDefaultValue: true,
    failOnInvalidFormat: false,
    refDepthMax: 5
  }
}

const updateServerConfig = (configFile: configType): void => {
  Object.entries(configFile).forEach(([key, value]: [string, ExpressConfig | JsfConfig]) => {
    serverConfig[key as keyof configType] = {
      ...serverConfig[key as keyof configType],
      ...value
    }
  })
}


void (async (): Promise<void> => {

  const configFile = await importConfigFile({ filePath: argv["mock-config"] as string | undefined })
  const overridesFile = await importOverridesFile({ filePath: argv["mock-overrides"] as string | undefined })

  if (configFile) {
    updateServerConfig(configFile)
  }

  debug(`Mock Server Config:\n${JSON.stringify(serverConfig, null, 2)}`)

  const {
    express: expressMiddlewareConfig,
    express: {
      port,
      openapiDefinition
    },
    jsf: jsfConfig } = serverConfig

  delete expressMiddlewareConfig.port
  delete expressMiddlewareConfig.openapiDefinition

  if (!openapiDefinition) {
    throw Error("No openapi definition")
  }

  jsf.option({
    ...jsfConfig
  })

  const apiSpec: OpenAPIV3.Document = validUrl.isWebUri(openapiDefinition) ?
    (await axios.get(openapiDefinition)).data :
    require(join(process.cwd(), openapiDefinition))

  // the current implementation doesn't implement security handlers
  apiSpec.paths = deletePathsSecurity(apiSpec.paths)

  // refs is an object with a method called "get" that return resolved json path
  const refs = await $RefParser.resolve(apiSpec)

  const app = express()

  app.use(cors())

  app.use(bodyParser.json())

  app.use(
    middleware({
      apiSpec,
      ...expressMiddlewareConfig,
      operationHandlers: {
        basePath: "",
        resolver: (handlersPath: string, route: RouteMetadata, apiDoc: OpenAPIV3.Document): RequestHandler =>
          createOperationId({ refs, apiDoc, overridesFile, route })
      }
    })
  )

  app.listen(port, () => debug(`Listening on port: ${port}`))
})()
  .catch((err: Error) => debug(err))
