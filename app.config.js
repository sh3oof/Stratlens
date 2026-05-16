// app.config.js takes precedence over app.json.
// The `config` argument receives the app.json content already merged in.
// We spread it and add `extra` so env vars are accessible via Constants.expoConfig.extra
// in any environment where process.env is not inlined (simulators, EAS, CI).
module.exports = ({ config }) => ({
  ...config,
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
});
