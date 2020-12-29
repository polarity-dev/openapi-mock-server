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
import { deletePathsSecurity, logFunctionErrorResponse } from "./lib/utils"
import { ExpressConfig } from "./types/expressConfig"
import { JsfConfig } from "./types/jsfConfig"

const debug = Debug("mock")

const cliInputs = {
  express: {
    port: argv.port,
    openapiDefinition: argv.openapi,
    validateRequests: argv["express.validateRequests"],
    validateResponses: argv["express.validateResponses"],
    unknownFormats: argv["express.unknownFormats"]
  },
  jsf: {
    fillProperties: argv["jsf.fillProperties"],
    useExamplesValue: argv["jsf.useExamplesValue"],
    useDefaultValue: argv["jsf.useDefaultValue"],
    failOnInvalidFormat: argv["jsf.failOnInvalidFormat"]
  }
}

const updateServerConfig = (serverConfig: configType, newServerConfig: configType): void => {
  Object.entries(newServerConfig).forEach(([key, value]: [string, ExpressConfig | JsfConfig]) => {
    const noUndefinedKeys = Object.fromEntries(Object.entries(value)
      // eslint-disable-next-line no-unused-vars
      .filter(([key, value]) => value !== undefined))

    serverConfig[key as keyof configType] = {
      ...serverConfig[key as keyof configType],
      ...noUndefinedKeys
    }
  })
}


void (async(): Promise<void> => {

  const serverConfig: configType = {
    express: {
      port: 8080,
      validateRequests: false,
      validateResponses: false,
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

  const configFile = await importConfigFile({ filePath: argv["mock-config"] as string | undefined })

  if (configFile.type === "error") {
    logFunctionErrorResponse(configFile)
    return
  }

  if (configFile.data) {
    updateServerConfig(serverConfig, configFile.data)
  }

  updateServerConfig(serverConfig, cliInputs)

  const overridesFile = await importOverridesFile({ filePath: argv["mock-overrides"] as string | undefined })

  if (overridesFile.type === "error") {
    logFunctionErrorResponse(overridesFile)
    return
  }


  debug(`Mock Server Config:\n${JSON.stringify(serverConfig, null, 2)}`)

  const {
    express: expressMiddlewareConfig,
    express: {
      port,
      openapi
    },
    jsf: jsfConfig } = serverConfig

  delete expressMiddlewareConfig.port
  delete expressMiddlewareConfig.openapi

  if (!openapi) {
    logFunctionErrorResponse({
      type: "error",
      title: "Missing required parameters",
      messages: ["No OpenAPI Specification"],
      hints: ["It can be specified via CLI flag \"--openapi\". (es. mock --openapi \"path or URL to the OpenAPI Specification\")"],
      docs: "https://github.com/soluzionifutura/openapi-mock-server"

    })
    return
  }

  jsf.option({
    ...jsfConfig
  })

  const apiSpec: OpenAPIV3.Document = validUrl.isWebUri(openapi) ?
    (await axios.get(openapi)).data :
    require(join(process.cwd(), openapi))

  // the current implementation doesn't implement security handlers
  const pathsWithoutSecurity = deletePathsSecurity(apiSpec.paths)

  if (pathsWithoutSecurity.type === "error") {
    logFunctionErrorResponse(pathsWithoutSecurity)
    return
  }

  apiSpec.paths = pathsWithoutSecurity.data

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
          createOperationId({ refs, apiDoc, overridesFile: overridesFile.data, route })
      }
    })
  )

  app.listen(port, () => console.info(`Listening on port: ${port}`))

})()
  .catch((err: Error) => {
    logFunctionErrorResponse({
      type: "error",
      title: "Unexpected error",
      messages: [err.message],
      hints: ["This error seems to be an bug, please open an Issue on Github | https://github.com/soluzionifutura/openapi-mock-server/issues"],
      docs: "https://github.com/soluzionifutura/openapi-mock-server"
    })
  })
