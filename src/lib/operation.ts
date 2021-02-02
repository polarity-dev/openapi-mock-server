import { Response, RequestHandler } from "express"
import { RouteMetadata } from "express-openapi-validator/dist/framework/openapi.spec.loader"
import { OpenAPIV3, OpenApiRequest, OpenApiRequestMetadata } from "express-openapi-validator/dist/framework/types"
import jsf from "json-schema-faker"
import $RefParser from "json-schema-ref-parser"
import Debug from "debug"

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import PathMatch from "path-match"

import { MockOverrides } from "../types/mockOverrides"

const searchMockResponse = ({ pathOverrides, url }: { pathOverrides: MockOverrides["routes"], url: string }): MockOverrides["routes"][0]["responses"][0] | undefined => {

  if (!pathOverrides.length) {
    return
  }

  let mockResponse: MockOverrides["routes"][0]["responses"][0] | undefined

  mockResponse = getMockResponse({
    statusCode: 200,
    mockResponses: pathOverrides
      .find(({ request: { path } }: MockOverrides["routes"][0]) => path === url)
  })

  if (!mockResponse) {
    mockResponse = getMockResponse({
      statusCode: 200,
      mockResponses: pathOverrides[0]
    })
  }

  return mockResponse
}

const getMockResponse = ({ mockResponses, statusCode }: { mockResponses?: MockOverrides["routes"][0], statusCode: number }): MockOverrides["routes"][0]["responses"][0] | undefined =>
  mockResponses
    ?.responses
    .find(({ statusCode: code }: MockOverrides["routes"][0]["responses"][0]) => code === statusCode)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generateRandomResponse = ({ openapi, refs, apiDoc }: { openapi?: OpenApiRequestMetadata, refs: $RefParser.$Refs, apiDoc: OpenAPIV3.Document }): { statusCode: number, body: any } => {

  if (!openapi) {
    return {
      statusCode: 500,
      body: {
        message: "No openapi definition found!"
      }
    }
  }

  const response200 = (openapi.schema.responses as OpenAPIV3.ResponsesObject)["200"]

  if (!response200) {
    return {
      statusCode: 500,
      body: {
        message: "No 200 response found!"
      }
    }
  }

  // Property 'description' is missing in type 'JSONSchema6Array' but required in type 'ResponseObject'.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let responseSchemaInfo: any = {}

  try {
    responseSchemaInfo = refs.get((response200 as OpenAPIV3.ReferenceObject)["$ref"])
  } catch (err) {
    // inline schema
    responseSchemaInfo = response200
  }

  try {
    const responseJsonSchema = responseSchemaInfo
      ?.content["application/json"]
      ?.schema

    return {
      statusCode: 200,
      body: jsf.generate({
        ...responseJsonSchema,
        components: apiDoc.components
      })
    }

  } catch (err) {
    return {
      statusCode: 500,
      body: {
        message: "No json schema found!"
      }
    }
  }
}

const getOperation = ({ pathOverrides, refs, apiDoc, debugRequest, debugResponse }: { refs: $RefParser.$Refs, apiDoc: OpenAPIV3.Document, pathOverrides: MockOverrides["routes"], debugRequest: Debug.Debugger, debugResponse: Debug.Debugger }) => (req: OpenApiRequest, res: Response): void => {
  debugRequest("Received:\n" +
    JSON.stringify({
      url: req.url,
      params: req.params,
      headers: req.headers,
      body: req.body
    }, null, 2)
  )

  const mockResponse = searchMockResponse({
    url: req.url,
    pathOverrides
  })

  if (mockResponse) {
    debugResponse("Response:\n" +
      JSON.stringify({
        statusCode: 200,
        headers: mockResponse.headers,
        body: mockResponse.body
      }, null, 2)
    )

    res.status(200).set(mockResponse.headers).json(mockResponse.body)

    return
  }

  const randomResponse = generateRandomResponse({ openapi: req.openapi as OpenApiRequestMetadata, refs, apiDoc })

  debugResponse("Response:\n" +
    JSON.stringify({
      statusCode: randomResponse.statusCode,
      body: randomResponse.body
    }, null, 2)
  )

  res.status(randomResponse.statusCode).json(randomResponse.body)
}

const getPathOverrides = ({ overridesFile, requestMethod, expressRoute }: { overridesFile?: MockOverrides, requestMethod: string, expressRoute: string }): MockOverrides["routes"] => {

  if (!overridesFile) {
    return []
  }

  const pathMatch = PathMatch({
    sensitive: false,
    strict: false,
    end: false
  })(expressRoute)

  requestMethod = requestMethod.toLocaleLowerCase()

  return overridesFile
    .routes
    .filter(
      ({ request: { path, method } }: { request: { path: string, method: string } }) =>
        pathMatch(path)
        && method === requestMethod
    )
}

export const createOperationId = ({ refs, apiDoc, overridesFile, route }: { refs: $RefParser.$Refs, apiDoc: OpenAPIV3.Document, overridesFile?: MockOverrides, route: RouteMetadata }): RequestHandler => {

  const debugRequest = Debug("mock-request")
  const debugResponse = Debug("mock-response")

  const pathOverrides: MockOverrides["routes"] = getPathOverrides({
    overridesFile,
    requestMethod: route.method,
    expressRoute: route.expressRoute
  })

  return getOperation({
    pathOverrides,
    refs,
    apiDoc,
    debugRequest,
    debugResponse
  })
}

