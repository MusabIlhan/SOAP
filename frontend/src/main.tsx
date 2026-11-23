import "@mantine/core/styles.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";

import { MantineProvider } from "@mantine/core";
import { createRoot } from "react-dom/client";

import App from "./App";
import { charted, theme } from "./theme";

document.body.style.background = charted.background;
document.body.style.minHeight = "100vh";

createRoot(document.getElementById("root")!).render(
  <MantineProvider theme={theme} forceColorScheme="light">
    <App />
  </MantineProvider>,
);
