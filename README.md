# Patterson's Shopify Product Summary Microservice

### Running a Local Server

- Create a `.env` file in the root of the project with `SHOP` and `ACCESS_TOKEN` specified.
- To run the local Express.js server, run `docker compose build` and then `docker compose up`
- The default `PORT` is `3001`, you can access the local server at `http://localhost:3001/`
- Example endpoints:
    - `http://localhost:3001/projects`
    - `http://localhost:3001/projects?limit=10`
    - `http://localhost:3001/products?limit=5&cursor=7`
    - `http://localhost:3001/products/1234567890`
    - `http://localhost:3001/api-stats`

### Troubleshooting

- If while using the site, Redis starts persisting cached data between runs, you may need to run `docker compose down` to delete the containers.
    - If persistence was desired, then all I'd need to do is add a docker volume for the redis instance to use. But, I figure for debugging purposes, resetting the cache per run is a little easier ;)

### Development

- To run the linter, run `npm run lint`
- To automatically fix lint errors, run `npm run format`
- To run the Jest tests, run `npm run test` (after running `npm install`)
