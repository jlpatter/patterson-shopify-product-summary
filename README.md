# Patterson's Shopify Product Summary Microservice

### Running a Local Server

- Create a `.env` file in the root of the project with `SHOP` and `ACCESS_TOKEN` specified.
- To run the local Express.js server, run `docker compose build` and then `docker compose up`
- The default `PORT` is `3001`, you can access the local server at `http://localhost:3001/projects` for example
- Example endpoints:
    - `http://localhost:3001/projects`
    - `http://localhost:3001/projects?limit=10`
    - `http://localhost:3001/products?limit=5&cursor=7`
    - `http://localhost:3001/products/1234567890`
    - `http://localhost:3001/api-stats`

### Development

- To run the linter, run `npm run lint`
- To automatically fix lint errors, run `npm run format`
