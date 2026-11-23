import { createTheme, type MantineColorsTuple } from "@mantine/core";

/**
 * The Charted look from mocks/base.css: Manrope, deep green with a lime accent,
 * pill buttons, and type large enough for an older clinician to read from a step away.
 * Laptop width only (1280 to 1440 px).
 */
export const charted = {
  ink: "#343434",
  muted: "#6B6F6A",
  green: "#285337",
  lime: "#B4E33F",
  pale: "#E5EFD9",
  mist: "#F2F6EC",
  line: "#E6E6E6",
  /** Page background behind every state. */
  background: "linear-gradient(180deg, #E9F2DF 0%, #F7FAF3 45%, #FFFFFF 100%)",
  /** Soft shadow under white cards. */
  cardShadow: "0 10px 30px rgba(40, 83, 55, 0.06)",
} as const;

// Shade 6 is the exact brand colour; the rest are for hover, light fills and borders.
const brand: MantineColorsTuple = [
  "#EEF6EE",
  "#DCEBDD",
  "#B5D6B9",
  "#8CC093",
  "#69AD73",
  "#4B8A57",
  "#285337",
  "#22472F",
  "#1B3A26",
  "#132A1B",
];

// Shade 5 is the exact lime.
const lime: MantineColorsTuple = [
  "#F7FCE9",
  "#EEF8D2",
  "#DCF2A5",
  "#CBEC78",
  "#BFE757",
  "#B4E33F",
  "#A3CF31",
  "#8DB627",
  "#769A1D",
  "#5D7A12",
];

export const theme = createTheme({
  fontFamily: "Manrope, system-ui, sans-serif",
  black: charted.ink,
  colors: { brand, lime },
  primaryColor: "brand",
  primaryShade: 6,
  defaultRadius: "lg",
  radius: { xs: "6px", sm: "10px", md: "16px", lg: "24px", xl: "32px" },
  fontSizes: { xs: "16px", sm: "18px", md: "20px", lg: "24px", xl: "28px" },
  lineHeights: { xs: "1.4", sm: "1.45", md: "1.5", lg: "1.4", xl: "1.3" },
  spacing: { xs: "8px", sm: "12px", md: "16px", lg: "24px", xl: "40px" },
  headings: {
    fontFamily: "Manrope, system-ui, sans-serif",
    fontWeight: "600",
    sizes: {
      h1: { fontSize: "52px", lineHeight: "1.15" },
      h2: { fontSize: "40px", lineHeight: "1.2" },
      h3: { fontSize: "30px", lineHeight: "1.25" },
      h4: { fontSize: "24px", lineHeight: "1.3" },
    },
  },
  components: {
    // Pill buttons, as in the mocks.
    Button: { defaultProps: { radius: 999, size: "xl" } },
    ActionIcon: { defaultProps: { radius: 999 } },
    Card: { defaultProps: { radius: "lg", withBorder: true, padding: "xl" } },
    Text: { defaultProps: { size: "md" } },
  },
});
