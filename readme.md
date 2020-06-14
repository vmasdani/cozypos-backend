# Cozy PoS Backend Deno

### Steps to run

1. Create .env file
```sh
PASSWORD=(generated password from GET /password)
DB_HOST=
DB_NAME=
DB_USERNAME=
DB_PASSWORD=
```

2. Download [Deno](https://deno.land/)
```
curl -fsSL https://deno.land/x/install/install.sh | sh
```

3. Run shell script
```
./run.sh

// or

deno run --allow-net --allow-read --allow-env --unstable -c tsconfig.json main.ts
```
