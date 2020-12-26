import { RequestHandler } from "express";
import { RouteMetadata } from "express-openapi-validator/dist/framework/openapi.spec.loader";
import { OpenAPIV3 } from "express-openapi-validator/dist/framework/types";
import $RefParser from "json-schema-ref-parser";
import { MockOverrides } from "../types/mockOverrides";
export declare const createOperationId: ({ refs, apiDoc, overridesFile, route }: {
    refs: $RefParser.$Refs;
    apiDoc: OpenAPIV3.Document;
    overridesFile?: MockOverrides | undefined;
    route: RouteMetadata;
}) => RequestHandler;
