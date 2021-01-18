import json from "@rollup/plugin-json"
import commonjs from "@rollup/plugin-commonjs"
import typescript from "rollup-plugin-typescript2"
import resolve from "@rollup/plugin-node-resolve"
import copy from "rollup-plugin-copy"
import { terser } from "rollup-plugin-terser"

export default [
  {
    input: "./src/index.ts",
    output: [{
      file: "./dist/index.js",
      format: "cjs",
      exports: "default"
    }],
    plugins: [
      json(),
      copy({
        targets: [
          { src: "src/types", dest: "dist" }
        ]
      }),
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
  }, {
    input: "./src/bin.ts",
    output: [{
      banner: "#!/usr/bin/env node",
      file: "./bin/index.js",
      format: "cjs"
    }],
    plugins: [
      json(),
      copy({
        targets: [
          { src: "src/types", dest: "bin" }
        ]
      }),
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