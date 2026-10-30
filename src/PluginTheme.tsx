import { useEffect, useMemo, useState, type ReactNode } from "react";
import OBR, { type Theme as HostTheme } from "@owlbear-rodeo/sdk";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import GlobalStyles from "@mui/material/GlobalStyles";

export function PluginTheme({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HostTheme>();
  const [previewMode, setPreviewMode] = useState<"light" | "dark">(() =>
    new URLSearchParams(location.search).get("theme") === "light"
      ? "light"
      : "dark",
  );
  useEffect(() => {
    if (!OBR.isAvailable) {
      const media = matchMedia("(prefers-color-scheme: light)");
      if (!new URLSearchParams(location.search).has("theme"))
        setPreviewMode(media.matches ? "light" : "dark");
      return;
    }
    let disposed = false;
    let cleanup: (() => void) | undefined;
    let revision = 0;
    OBR.onReady(() => {
      if (disposed) return;
      cleanup = OBR.theme.onChange((value) => {
        revision++;
        if (!disposed) setHost(value);
      });
      const request = revision;
      void OBR.theme
        .getTheme()
        .then((value) => {
          if (!disposed && revision === request) setHost(value);
        })
        .catch(console.error);
    });
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);
  const theme = useMemo(
    () =>
      createTheme({
        palette: host
          ? {
              mode: host.mode === "LIGHT" ? "light" : "dark",
              text: host.text,
              primary: host.primary,
              secondary: host.secondary,
              background: host.background,
            }
          : {
              mode: previewMode,
              primary: { main: previewMode === "dark" ? "#bb99ff" : "#7655b5" },
              background: {
                default: previewMode === "dark" ? "#222639" : "#ffffff",
                paper: previewMode === "dark" ? "#3d4051" : "#ffffff",
              },
            },
        shape: { borderRadius: 16 },
        typography: {
          fontFamily: 'Roboto, "Noto Sans Thai", Arial, Tahoma, sans-serif',
          fontSize: 13,
        },
        components: {
          MuiButtonBase: { defaultProps: { disableRipple: true } },
          MuiButton: {
            defaultProps: { size: "small", variant: "outlined" },
            styleOverrides: {
              root: {
                textTransform: "none",
                minWidth: 0,
                fontSize: 12,
                minHeight: 30,
              },
            },
          },
          MuiInputBase: {
            styleOverrides: {
              root: { fontSize: 13 },
              input: { fontVariantNumeric: "tabular-nums" },
            },
          },
          MuiOutlinedInput: {
            styleOverrides: { input: { padding: "6px 8px" } },
          },
          MuiSelect: {
            defaultProps: { size: "small" },
            styleOverrides: {
              select: {
                padding: "6px 26px 6px 8px",
                minHeight: "0 !important",
              },
            },
          },
          MuiMenuItem: {
            styleOverrides: { root: { fontSize: 13, minHeight: 34 } },
          },
          MuiCheckbox: {
            defaultProps: { size: "small" },
            styleOverrides: { root: { padding: 2 } },
          },
        },
      }),
    [host, previewMode],
  );
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles
        styles={{
          ":root": {
            colorScheme: "normal",
            color: theme.palette.text.primary,
            "--muted": theme.palette.text.secondary,
            "--line": theme.palette.divider,
            "--panel": theme.palette.background.paper,
            "--text": theme.palette.text.primary,
            "--accent": theme.palette.primary.main,
            "--selected": theme.palette.action.selected,
            "--hover": theme.palette.action.hover,
          },
          "html, body, #root": { background: "transparent" },
          ".stat-app": {
            background: "transparent",
            color: theme.palette.text.primary,
          },
        }}
      />
      {children}
    </ThemeProvider>
  );
}
