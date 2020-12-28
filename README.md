# openapi-mock-server

`openapi-mock-server` is an easy to use CLI program to create mock servers from an OpenAPI Specification. 

This module is built on top of [express-openapi-validator](https://github.com/cdimascio/express-openapi-validator#-express-openapi-validator) and use [json-schema-faker](https://github.com/json-schema-faker/json-schema-faker) to generate random responses to HTTP requests.

> Fully supports circular $ref pointer in the OpenAPI Specification.

## Installation

This is a [Node.js](https://nodejs.org/en/) module available through the [npm registry](https://www.npmjs.com).

Installation is done using the [`npm install` command](https://docs.npmjs.com/downloading-and-installing-packages-locally):

```sh
$ npm install -g @soluzionifutura/openapi-mock-server
```

## Quick start

Install `openapi-mock-server` globally
```sh
$ npm install -g @soluzionifutura/openapi-mock-server
```

Start the mock server

```sh
$ mock --openapi "path or URL to the OpenAPI Specification"

# or run the mock server in debug mode

$ DEBUG=mock* mock --openapi "path or URL to the OpenAPI Specification"
```

## Command line flags

Many options have command line equivalents. In those cases, any arguments passed here will override the config file, if you're using one. This is a list of all supported options:

```
--openapi                              path or URL to the OpenAPI Specification
--port                                 mock server port (default 8080)
--mock-config                          path to mock server config file
                                       (default mock-config.(ts, js, json))
--mock-overrides                       path to mock server overrides config file
                                       (default mock-overrides.(ts, js, json))

--express.validateRequests             determines whether the validator should validate
                                       requests (default false)
--express.validateResponses            determines whether the validator should validate
                                       responses (default false)
--express.unknownFormats               defines how the validator should behave if an unknown
                                       or custom format is encountered (default "ignore")

--jsf.fillProperties                   if enabled, it will try to generate missing properties
                                       to fulfill the schema definition (default: false)
--jsf.useExamplesValue                 if enabled, it will return a random value from examples
                                       if they're present (default: true)
--jsf.useDefaultValue                  if enabled, it will return the default value if present
                                       (default: true)
--jsf.failOnInvalidFormat              if enabled, it will throw an Error for unknown formats
                                       (default: false)
```

## Configuration files

`openapi-mock-server` accepts two types of configuration files:

1. a mock server [config file](#mock-server-config-file)
2. a mock server [overrides config file](#mock-server-overrides-config-file)

### Mock server config file

> By default `openapi-mock-server` will try to import the files `mock-config` (.ts, .js, .json) from the current directory `process.cwd()`. The first successful import will be used.

You can specify the path of this file via CLI flag `--mock-config`

```bash
$ mock --mock-config path/to/file
```

This file is used to configure express and json-schema-faker of the mock server, it's divided into two sections:
1. `express` contains express configurable options. [json schema](./src/schemas/expressConfig.json) | [about express-openapi-validator options](https://github.com/cdimascio/express-openapi-validator#openapivalidator-middleware-options) (not all options are supported, see the json schema to see which ones are supported)
2. `jsf` contains json-schema-faker configurable options. [json schema](./src/schemas/jsfConfig.json) | [about jsf options](https://github.com/json-schema-faker/json-schema-faker/tree/master/docs#available-options)

```js
// example
{
  "express": {
    "port": 9090,
    "openapi": "path/or/URL/to/OpenAPI/Specification"
  },
  "jsf": {
    "failOnInvalidFormat": true
  }
}
```

### Mock server overrides config file

> By default `openapi-mock-server` will try to import the files `mock-overrides` (.ts, .js, .json) from the current directory `process.cwd()`. The first successful import will be used.

You can specify the path of this file via CLI flag `--mock-overrides`

```bash
$ mock --mock-overrides path/to/file
```

This file able you to override the mock server behavior to particular http requests [json schema](./src/schemas/mockOverrides.json).

If an override of a path is provided that it will be used instead of the random response. Only `statusCode: 200` is supported for now.

```js
// example
{
  "routes": [
    {
      "request": {
        "path": "path/to/override",
        "method": "get"
      },
      "responses": [
        {
          "statusCode": 200,
          "headers": {
            // response header
          },
          "body": {
            // response body
          }
        }
      ]
    }
  ]
}
```

## Developer instructions

In order to work with this project you need:

- [Node.js](https://nodejs.org/en/)

Before you start developing you must prepare the environment

```bash
$ git clone https://github.com/soluzionifutura/openapi-mock-server.git
$ cd openapi-mock-server
$ npm install
```

To build the solution run

```bash
$ npm run build
```

It will build the solution in the `dist/` folder. Thus to try it out

```bash
$ npm start
```

If you just wanna run your changes locally without building the project

```bash
$ npm run dev
```

> You may want to pass a CLI flag to the script. [npm documentation about "--"](https://docs.npmjs.com/cli/v6/commands/npm-run-script)  
> For example: `npm run dev -- --port 9090` or `npm start -- --port 9090`


**NOTE** If you change a **\*.json** file in `src/schemas` then you must regenerate typescript types running
```bash
$ npm run init:types
```