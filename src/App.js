import React, { Suspense } from "react";
import PropTypes from "prop-types";
import { MuiWidgetApiProvider } from "@matrix-widget-toolkit/mui";
import { BrowserRouter } from "react-router-dom";
import { WidgetParameter } from "@matrix-widget-toolkit/api";
import MatrixClientProvider from "./components/MatrixClientProvider";
import { ThemeProvider } from "./context/ThemeContext";
import { useWidgetApi } from "@matrix-widget-toolkit/react";

const ThemedMatrixClientProvider = () => {
  const widgetApi = useWidgetApi();
  
  return (
    <ThemeProvider widgetApi={widgetApi}>
      <MatrixClientProvider />
    </ThemeProvider>
  );
};

function App({ widgetApiPromise }) {
  return (
    <BrowserRouter>
      <Suspense fallback={<></>}>
        <MuiWidgetApiProvider
          widgetApiPromise={widgetApiPromise}
          widgetRegistration={{
            name: "P2P-NFT-Widget",
            type: "com.example.clock",
            data: { title: "P2P-NFT-Widget" },
            requiredParameters: [WidgetParameter.DeviceId],
          }}
        >
          <ThemedMatrixClientProvider />
        </MuiWidgetApiProvider>
      </Suspense>
    </BrowserRouter>
  );
}
App.propTypes = {
  widgetApiPromise: PropTypes.object.isRequired,
};

export default App;
