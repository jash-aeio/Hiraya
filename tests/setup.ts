import "dotenv/config";

// Loaded before every suite. Keep this file free of database connections: the
// integration suite opens its own so that unit tests stay runnable with no
// Postgres at all.
process.env.TZ = "UTC";
