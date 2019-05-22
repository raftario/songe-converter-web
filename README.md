# [Songe Converter Web](https://raftario.github.io/songe-converter-web)
This is a web wrapper for [the original program](https://github.com/lolPants/songe-converter) by lolPants.
### Installation
1. Rename `.env.example` to `.env`. If you want to run the API yourself, choose a port to run it on. You can leave the `GH_TOKEN` variable empty but you risk getting rate limited.
2. Rename `src/config.js.example` to `src/config.js`. If you plan to edit the API, set the API url to `http://localhost:{port you chose to run the API on}`.
### Usage
* `yarn start` to start the client development server.
* `yarn build` to create an optimized production build.
* `yarn test` to test the client.
* `yarn api` to start the API.
* `yarn lint` to apply Javascript Standard Style.
