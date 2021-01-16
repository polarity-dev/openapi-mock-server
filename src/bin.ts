// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import argv from "simple-argv"

import MockServer from "."

const mockConfigPath = argv["mock-config"]
const mockOverridesPath = argv["mock-overrides"]

const cliInputs = {
  express: {
    port: argv.port,
    openapi: argv.openapi,
    validateRequests: argv["express.validateRequests"],
    validateResponses: argv["express.validateResponses"],
    unknownFormats: argv["express.unknownFormats"]
  },
  jsf: {
    fillProperties: argv["jsf.fillProperties"],
    useExamplesValue: argv["jsf.useExamplesValue"],
    useDefaultValue: argv["jsf.useDefaultValue"],
    failOnInvalidFormat: argv["jsf.failOnInvalidFormat"]
  },
  cors: {
    origin: argv["cors.origin"],
    credentials: argv["cors.credentials"]
  }
}

void MockServer({
  mockConfigPath,
  mockOverridesPath,
  mockServerConfig: cliInputs
})