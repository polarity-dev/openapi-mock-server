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

import { createOperationId } from "./lib/operation"
import { importConfigFile, MockServerConfig, importOverridesFile } from "./lib/importConfig"
import { deletePathsSecurity, FunctionResponse, logFunctionErrorResponse } from "./lib/utils"
import { ExpressConfig } from "./types/expressConfig"
import { JsfConfig } from "./types/jsfConfig"
import { CorsConfig } from "./types/corsConfig"
import { MockOverrides } from "./types/mockOverrides"

const debug = Debug("mock")

const updateServerConfig = (serverConfig: MockServerConfig, newServerConfig: MockServerConfig): void => {
  Object.entries(newServerConfig).forEach(([key, value]: [string, ExpressConfig | JsfConfig | CorsConfig | undefined]) => {
    if (!value) {
      return
    }

    const noUndefinedKeys = Object.fromEntries(Object.entries(value)
      // eslint-disable-next-line no-unused-vars
      .filter(([key, value]) => value !== undefined))

    serverConfig[key as keyof MockServerConfig] = {
      ...serverConfig[key as keyof MockServerConfig],
      ...noUndefinedKeys
    }
  })
}

export type MockServerProps = {
  mockConfigPath?: string
  mockOverridesPath?: string
  mockServerConfig?: MockServerConfig
  mockOverrides?: MockOverrides
}

const MockServer = async({ mockConfigPath, mockOverridesPath, mockServerConfig, mockOverrides }: MockServerProps): Promise<void> => {

  const serverConfig: MockServerConfig = {
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
    },
    cors: {
      origin: "*",
      credentials: true
    }
  }

  const configFile = await importConfigFile({ filePath: mockConfigPath })

  if (configFile.type === "error") {
    logFunctionErrorResponse(configFile)
    return
  }

  if (configFile.data) {
    updateServerConfig(serverConfig, configFile.data)
  }

  if (mockServerConfig) {
    updateServerConfig(serverConfig, mockServerConfig)
  }

  const overridesFile = mockOverrides ?
    {
      type: "data",
      data: mockOverrides
    } as FunctionResponse<MockOverrides> :
    await importOverridesFile({ filePath: mockOverridesPath })

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
    } = {},
    jsf: jsfConfig,
    cors: corsOptions } = serverConfig

  if (expressMiddlewareConfig) {
    delete expressMiddlewareConfig.port
    delete expressMiddlewareConfig.openapi
  }

  if (!openapi) {
    logFunctionErrorResponse({
      type: "error",
      title: "Missing required parameters",
      messages: ["No OpenAPI Specification"],
      hints: [
        "It can be specified via CLI flag \"--openapi\". (es. mock --openapi \"path or URL to the OpenAPI Specification\")",
        "To learn more add \"DEBUG=mock*\" before \"mock\" command. es \"DEBUG=mock* mock\""
      ],
      docs: "https://github.com/soluzionifutura/openapi-mock-server#command-line-flags"
    })
    return
  }

  jsf.option({
    ...jsfConfig
  })

  let apiSpec: OpenAPIV3.Document


  try {
    apiSpec = validUrl.isWebUri(openapi) ?
      (await axios.get(openapi)).data :
      require(join(process.cwd(), openapi))
  } catch (err) {
    logFunctionErrorResponse({
      type: "error",
      title: "Import OpenAPI Specification error",
      messages: [err.message],
      hints: [
        `Check if this file/URL exists: ${validUrl.isWebUri(openapi) ?
          openapi :
          join(process.cwd(), openapi)}`
      ]
    })

    return
  }

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

  app.use(cors(corsOptions))

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

}

const MockServerWrap = (args: MockServerProps): Promise<void> =>
  MockServer(args)
    .catch((err: Error) => {
      logFunctionErrorResponse({
        type: "error",
        title: "Unexpected error",
        messages: [err.message],
        hints: ["This error seems to be an bug, please open an Issue on Github | https://github.com/soluzionifutura/openapi-mock-server/issues"],
        docs: "https://github.com/soluzionifutura/openapi-mock-server#openapi-mock-server"
      })
    })


MockServerWrap.default = MockServerWrap
export default MockServerWrap