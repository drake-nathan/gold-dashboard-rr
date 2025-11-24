import { useQuery } from "convex/react";
import { api } from "@gold-dashboard/convex-backend/api";
import { Text, View, ActivityIndicator } from "react-native";

export default function HomeScreen() {
  const stats = useQuery(api.dashboard.getStats);

  if (!stats) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-white p-4">
      <Text className="mb-4 text-2xl font-bold">Gold Dashboard Mobile</Text>
      <Text className="mb-2 text-gray-600">
        Gold Products: {stats.goldProducts.bestSpread.length}
      </Text>
      <Text className="mb-2 text-gray-600">
        Silver Products: {stats.silverProducts.bestSpread.length}
      </Text>
      <Text className="text-gray-600">
        Last Update:{" "}
        {stats.lastFetch ?
          new Date(stats.lastFetch.timestamp).toLocaleTimeString()
        : "N/A"}
      </Text>
    </View>
  );
}
