import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Router from "./src/components/Router";

const App = () => {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <Router />
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

export default App;