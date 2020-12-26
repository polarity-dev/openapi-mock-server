import json from "@rollup/plugin-json"
import commonjs from "@rollup/plugin-commonjs"
import typescript from "rollup-plugin-typescript2"
import resolve from "@rollup/plugin-node-resolve"
import { terser } from "rollup-plugin-terser"

export default [
  {
    input: "./src/index.ts",
    output: {
      file: "./dist/index.js",
      format: "cjs"
    },
    plugins: [
      json(),
      typescript({
        tsconfig: "./tsconfig.rollup.json"
      }),
      commonjs(),
      resolve({
        modulesOnly: true,
        preferBuiltins: true
      }),
      terser()
    ]
  }
]