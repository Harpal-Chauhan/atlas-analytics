import "dotenv/config";

for (const key of ["DATABASE_URL", "APP_DATABASE_URL"]) {
    const value = process.env[key];

    if (!value) {
        console.log(`${key}: MISSING`);
        continue;
    }

    const url = new URL(value);

    console.log({
        connection: key,
        hostname: url.hostname,
        database: url.pathname.slice(1),
        role: decodeURIComponent(url.username),
    });
}
