const siteUrl = process.env.EXPO_PUBLIC_SITE_URL || "https://entrelinha-se.vercel.app/";

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  expo: {
    name: "entrelinha-se",
    slug: "entrelinha-se",
    scheme: "entrelinhase",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    backgroundColor: "#F3EADC",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#F3EADC",
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "app.entrelinha.caderno",
    },
    android: {
      package: "app.entrelinha.caderno",
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#F3EADC",
      },
    },
    extra: {
      siteUrl,
      eas: {
        projectId: "97997ee6-e7d3-4b03-a182-e0c538c4cbb1",
      },
    },
    plugins: ["expo-status-bar"],
  },
};
