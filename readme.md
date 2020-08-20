# Cozy PoS Backend Deno
Cozy Point of Sales backend made in Deno, a new Javascript backend runtime based on Rust, V8, and Typescript. Last known running on `Deno 1.2.3`

### Steps to run
1. Get MySQL database running and create database, for example `cozypos`

2. Create .env file
```sh
PASSWORD=(generated password from GET /generate)
DB_HOST=
DB_NAME=
DB_USERNAME=
DB_PASSWORD=
```

3. Download [Deno](https://deno.land/) (Tested working on Deno 1.3.0)
```sh
curl -fsSL https://deno.land/x/install/install.sh | sh
```

4. Run shell script
```sh
./run.sh

// or

deno run --allow-net --allow-read --allow-env --unstable -c tsconfig.json main.ts
```
