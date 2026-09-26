import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";
import { WebView } from "react-native-webview";

const siteUrl = String(Constants.expoConfig?.extra?.siteUrl || "").trim();

export default function App() {
  const [failed, setFailed] = useState(false);

  if (!siteUrl || failed) {
    return (
      <View style={styles.empty}>
        <StatusBar style="dark" />
        <View style={styles.book}>
          <View style={styles.spine} />
          <View style={styles.page}>
            <Text style={styles.mark}>entrelinha-se</Text>
            <Text style={styles.body}>
              {failed
                ? "O caderno não abriu. Confere o endereço do site e gera o app de novo."
                : "Ainda falta o endereço do site. Quando ele estiver no ar, define EXPO_PUBLIC_SITE_URL e gera o APK."}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <StatusBar style="dark" />
      <WebView
        source={{ uri: siteUrl }}
        onError={() => setFailed(true)}
        onHttpError={() => setFailed(true)}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator color="#9A3E3A" />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#F3EADC" },
  empty: {
    flex: 1,
    backgroundColor: "#4A3426",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  book: {
    width: "100%",
    maxWidth: 360,
    minHeight: 280,
    flexDirection: "row",
    backgroundColor: "#F3EADC",
    borderRadius: 6,
  },
  spine: { width: 14, backgroundColor: "#6E4634" },
  page: { flex: 1, padding: 28, justifyContent: "center" },
  mark: {
    fontSize: 28,
    color: "#2C241C",
    marginBottom: 16,
  },
  body: { fontSize: 16, lineHeight: 24, color: "#5C4A3A" },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3EADC",
  },
});
