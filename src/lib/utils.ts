import { OpenAPIV3 } from "express-openapi-validator/dist/framework/types"

const methodsWithoutSecurity = (pathMethods: OpenAPIV3.PathItemObject): OpenAPIV3.PathItemObject =>
  Object.entries(pathMethods).map(([method, methodInfo]: [string, OpenAPIV3.OperationObject]) => {
    delete methodInfo["security"]
    return { [method]: methodInfo }
  }).reduce((acc, curr) => ({
    ...acc,
    ...curr
  }), {})


export const deletePathsSecurity = (paths: OpenAPIV3.PathsObject): OpenAPIV3.PathsObject =>
  Object.entries(paths).map(([pathKey, pathMethods]: [string, OpenAPIV3.PathItemObject]) => {
    return {
      [pathKey]: methodsWithoutSecurity(pathMethods)
    }
  }).reduce((acc, curr) => ({
    ...acc,
    ...curr
  }), {})

