# nextjs-dynamic-builder
A Node.js script to create a directly deployable and optimized Next.js build folder.

# Why?
Deployment (especially on Azure) can take a long time when using Next.js because of unnecessary files. This script filters only the necessary ones and creates a `build/` directory to deploy the project.

# Usage
First of all, place `build.js` and `buildParams.json` into the root of your project.

Every project has its own dependencies. So, the file `buildParams.json` should be filled with the dependent files, folders, and modules. The module versions will be the same as the base `package.json`.

Example parameters:
```json
{
  "scripts": {
    "start": "NODE_ENV=production node server.js"
  },
  "folders": ["public"],
  "files": [
    ".env",
    ".env.production",
    "next.config.js",
    "server.js",
    "strapi.js"
  ],
  "dependencies": [
    "axios",
    "dotenv",
    "express",
    "http-proxy-middleware",
    "next",
    "sanitize-html",
    "sharp",
    "showdown",
    "sqlite3"
  ]
}
```

Please note that even if the JSON attributes are empty, some values are default and added programmatically even if they are not provided. The `start` script can be overridden if needed.

Default values:
```json
{
  "scripts": {
    "start": "next start"
  },
  "folders": [".next"],
  "files": [],
  "dependencies": [
    "next",
  ]
}
```

After changing the JSON, run `node build.js` to create an optimized build.

# Deployment
Do not forget to change your YAML file's build steps to point to the newly created `build/` directory.

Example YAML:
```yaml
- name: Create optimized build
  run: |
    npm install
    node build.js
    cd build
    npm install

- name: Archive app files
  run: |
    cd build
    touch node-app.tar.gz
    tar --exclude=node-app.tar.gz -czvf node-app.tar.gz .

- name: Upload artifact for deployment job
  uses: actions/upload-artifact@v2
  with:
    name: node-app
    path: build/node-app.tar.gz
```
