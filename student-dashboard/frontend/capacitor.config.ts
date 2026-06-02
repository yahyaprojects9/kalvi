import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.kalvithozhan.student",
  appName: "Kalvi Thozhan",
  webDir: "dist/client",
  server: {
    androidScheme: "https",
  },
};

export default config;
