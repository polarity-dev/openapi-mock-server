import { join } from "path"
import { Validator } from "jsonschema"
import Debug from "debug"
import glob from "glob"

import { ExpressConfig } from "../types/expressConfig"
import { JsfConfig } from "../types/jsfConfig"
import { MockOverrides } from "../types/mockOverrides"
import { CorsConfig } from "../types/corsConfig"

import expressConfig from "../schemas/expressConfig.json"
import jsfConfig from "../schemas/jsfConfig.json"
import mockOverrides from "../schemas/mockOverrides.json"
import corsConfig from "../schemas/corsConfig.json"
import { FunctionResponse, FunctionErrorResponse, FunctionSuccessResponse, mergeFunctionErrorResponses } from "./utils"

const debug = Debug("mock")

export type configType = {
  express: ExpressConfig
  jsf: JsfConfig
  cors: CorsConfig
}
const createPaths = ({ filePath, defaultFileName }: { filePath?: string, defaultFileName: string }): string[] =>
  filePath
    ? [filePath]
    : ["ts", "js", "json"].map((fileType: string) => `${defaultFileName}.${fileType}`)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const importPaths = async<T>({ paths, jsonSchema }: { paths: string[], jsonSchema?: any }): Promise<FunctionResponse<T | undefined>> => {

  let fileConfig: T | undefined
  let importedFilePath: string | undefined

  for (const filePath of paths) {
    try {
      importedFilePath = join(process.cwd(), filePath)
      const { default: fileData }: { default: T } = await import(join(process.cwd(), filePath))

      fileConfig = fileData

      debug(`Imported file ${join(process.cwd(), filePath)}\n${JSON.stringify(fileConfig, null, 2)}`)
      break
    } catch (err) {
    }
  }

  if (jsonSchema && fileConfig) {
    const validationResult = new Validator().validate(fileConfig, jsonSchema)

    if (!validationResult.valid) {
      const error: FunctionErrorResponse = {
        type: "error",
        title: "JSON schema error",
        docs: "https://github.com/soluzionifutura/openapi-mock-server#configuration-files",
        messages: [`File: ${importedFilePath}`],
        hints: ["To learn more add \"DEBUG=mock*\" before \"mock\" command. es \"DEBUG=mock* mock\""]
      }
      for (const validationError of validationResult.errors) {
        error.messages.push(validationError.message)
      }
      return error
    }
  }

  return {
    type: "data",
    data: fileConfig
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const importFile = async<T>({ filePath, defaultFileName, jsonSchema }: { filePath?: string, defaultFileName: string, jsonSchema?: any }): Promise<FunctionResponse<T | undefined>> => {

  const paths = createPaths({ filePath, defaultFileName })

  const fileData = await importPaths<T>({
    paths,
    jsonSchema
  })

  if (filePath && fileData.type === "data" && !fileData.data) {
    return {
      type: "error",
      title: "Import file error",
      messages: [`${join(process.cwd(), filePath)} not found!`]
    }
  }

  return fileData
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const recursiveImport =  async<T>({ folderOrFilePath, jsonSchema }: {folderOrFilePath: string, jsonSchema?: any}): Promise<FunctionResponse<T | undefined>[]> => {
  const paths = glob.sync(folderOrFilePath)

  if (!paths.length) {
    return [{
      type: "error",
      title: "Import file error",
      messages: [
        `No files matched for this pattern: ${folderOrFilePath}!`,
        `Full pattern: ${join(process.cwd(), folderOrFilePath)}`
      ],
      hints: ["See an example here: https://github.com/soluzionifutura/openapi-mock-server#recursive-import-mock-overrides-files"],
      docs: "https://github.com/isaacs/node-glob#readme"
    }]
  }

  const filesData: FunctionResponse<T | undefined>[] = []

  for (const filePath of paths) {
    const importedFile = await importFile<T>({
      filePath,
      defaultFileName: "",
      jsonSchema
    })
    filesData.push(importedFile)
  }

  return filesData
}

export const importConfigFile = async({ filePath }: { filePath?: string }): Promise<FunctionResponse<configType | undefined>> => {

  const configFile = await importFile<configType>({
    filePath,
    defaultFileName: "mock-config",
    jsonSchema: {
      type: "object",
      properties: {
        express: expressConfig,
        jsf: jsfConfig,
        cors: corsConfig
      },
      additionalProperties: false
    }
  })

  return configFile
}

export const importOverridesFile = async({ filePath }: { filePath?: string }): Promise<FunctionResponse<MockOverrides | undefined>> => {

  if (!filePath) {
    const overridesConfigFile = await importFile<MockOverrides>({
      filePath,
      defaultFileName: "mock-overrides",
      jsonSchema: mockOverrides
    })

    return overridesConfigFile
  }

  const importedMockOverrides =  await recursiveImport<MockOverrides>({
    folderOrFilePath: filePath,
    jsonSchema: mockOverrides
  })

  const functionErrorResponse = mergeFunctionErrorResponses<MockOverrides|undefined>({
    functionResponses: importedMockOverrides,
    toAppend: {
      messages: true
    }
  })

  if (functionErrorResponse) {
    return functionErrorResponse
  }

  const mergedMockOverrides = mergeMockOverrides({
    mockOverrides: importedMockOverrides
  })

  return mergedMockOverrides
}

const mergeMockOverrides = ({ mockOverrides }: {mockOverrides: FunctionResponse<MockOverrides | undefined>[]}): FunctionResponse<MockOverrides> =>
  ({
    type: "data",
    data: {
      routes: mockOverrides
        .map((overrides) => (overrides as FunctionSuccessResponse<MockOverrides>).data.routes)
        .flat()
    }
  })