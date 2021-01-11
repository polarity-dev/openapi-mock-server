import { OpenAPIV3 } from "express-openapi-validator/dist/framework/types"
import colors from "colors"

export type FunctionResponse<T> = FunctionSuccessResponse<T> | FunctionErrorResponse
export type FunctionSuccessResponse<T> = {
  type: "data"
  data: T
}
export type FunctionErrorResponse = {
  type: "error"
  title: string
  messages: string[]
  hints?: string[]
  docs?: string
}

export const logFunctionErrorResponse = (error: FunctionErrorResponse): void => {
  console.error(colors.red.bold(`An error occurred: ${error.title}`))

  error.messages.forEach(message => console.error(`* ${message}`))

  if (error.hints) {
    console.error(colors.bold("\nHints:"))

    error.hints.forEach(hint => console.error(colors.cyan(`* ${hint}`)))
  }

  if (error.docs) {
    console.error(`\nMore information at ${error.docs}`)
  }
}

const methodsWithoutSecurity = (pathMethods: OpenAPIV3.PathItemObject): OpenAPIV3.PathItemObject =>
  Object.entries(pathMethods).map(([method, methodInfo]: [string, OpenAPIV3.OperationObject]) => {
    delete methodInfo["security"]
    return { [method]: methodInfo }
  }).reduce((acc, curr) => ({
    ...acc,
    ...curr
  }), {})


export const deletePathsSecurity = (paths: OpenAPIV3.PathsObject): FunctionResponse<OpenAPIV3.PathsObject> => {
  try {
    const pathsWithoutSecurity = Object.entries(paths).map(([pathKey, pathMethods]: [string, OpenAPIV3.PathItemObject]) => {
      return {
        [pathKey]: methodsWithoutSecurity(pathMethods)
      }
    }).reduce((acc, curr) => ({
      ...acc,
      ...curr
    }), {})

    return {
      type: "data",
      data: pathsWithoutSecurity
    }
  } catch (err) {
    return {
      type: "error",
      title: "OpenAPI paths parsing error",
      messages: [err.message],
      hints: ["It seems that your OpenAPI Specification is invalid"],
      docs: "https://swagger.io/specification/"
    }
  }
}

