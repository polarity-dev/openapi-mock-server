import { join } from "path"
import { Validator } from "jsonschema"
import Debug from "debug"

import { ExpressConfig } from "../types/expressConfig"
import { JsfConfig } from "../types/jsfConfig"
import { MockOverrides } from "../types/mockOverrides"

import expressConfig from "../schemas/expressConfig.json"
import jsfConfig from "../schemas/jsfConfig.json"
import mockOverrides from "../schemas/mockOverrides.json"

const debug = Debug("mock")

export type configType = {
  express: ExpressConfig
  jsf: JsfConfig
}
const createPaths = ({ filePath, defaultFileName }: { filePath?: string, defaultFileName: string }): string[] =>
  filePath
    ? [filePath]
    : ["ts", "js", "json"].map((fileType: string) => `${defaultFileName}.${fileType}`)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const importPaths = async<T>({ paths, jsonSchema }: { paths: string[], jsonSchema?: any }): Promise<T | undefined> => {

  let fileConfig: T | undefined

  for (const filePath of paths) {
    try {
      const { default: fileData }: { default: T } = await import(join(process.cwd(), filePath))

      fileConfig = fileData

      debug(`Imported file ${join(process.cwd(), filePath)}\n${JSON.stringify(fileConfig, null, 2)}`)
      break
    } catch (err) {
    }
  }

  if (!jsonSchema) {
    const validationResult = new Validator().validate(fileConfig, jsonSchema)

    if (!validationResult.valid) {
      throw Error(JSON.stringify(validationResult.errors, null, 2))
    }
  }

  return fileConfig
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const importFile = async<T>({ filePath, defaultFileName, jsonSchema }: { filePath?: string, defaultFileName: string, jsonSchema?: any }): Promise<T | undefined> => {

  const paths = createPaths({ filePath, defaultFileName })

  const fileData = await importPaths<T>({
    paths,
    jsonSchema
  })

  if (filePath && !fileData) {
    throw Error(`${join(process.cwd(), filePath)} not found!`)
  }

  return fileData
}

export const importConfigFile = async({ filePath }: { filePath?: string }): Promise<configType | undefined> => {

  const configFile = await importFile<configType>({
    filePath,
    defaultFileName: "mock-config",
    jsonSchema: {
      type: "object",
      properties: {
        express: expressConfig,
        jsf: jsfConfig
      },
      additionalProperties: false
    }
  })

  return configFile
}

export const importOverridesFile = async({ filePath }: { filePath?: string }): Promise<MockOverrides | undefined> => {

  const overridesConfigFile = await importFile<MockOverrides>({
    filePath,
    defaultFileName: "mock-overrides",
    jsonSchema: mockOverrides
  })

  return overridesConfigFile
}
