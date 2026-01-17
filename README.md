# Patterson's Shopify Product Summary Microservice

### Running a Local Server
* Create a `.env` file in the root of the project with `SHOP` and `ACCESS_TOKEN` specified.
* To run the local Express.js server, run `docker compose build` and then `docker compose up`
* The default `PORT` is `3001`, you can access the local server at `http://localhost:3001/projects` for example

### Development
* To run the linter, run `npm run lint`
* To automatically fix lint errors, run `npm run format`
